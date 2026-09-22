import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  session,
  type Event as ElectronEvent,
  type HandlerDetails,
  type RenderProcessGoneDetails,
  type WebContents,
} from "electron";
import {
  APP_ID,
  PRODUCT_NAME,
  WINDOW_BACKGROUND,
  getTrustedOrigin,
  resolveAppUrl,
} from "./config";
import { openExternalSafely } from "./security";
import { isSafeExternalUrl, isTrustedNavigationUrl } from "./urls";

const LOAD_ERROR_MESSAGE =
  "Não foi possível conectar à Central Acadêmica. Verifique sua conexão e tente novamente.";
const CRASH_ERROR_MESSAGE =
  "A Central Acadêmica encontrou um problema inesperado e precisa ser recarregada.";

const SMOKE_TEST_FLAG = "--smoke-test";
const SMOKE_TEST_TIMEOUT_MS = 45_000;
const ABORTED_ERROR_CODE = -3;

let mainWindow: BrowserWindow | null = null;
let handlingLoadError = false;
let smokeFinished = false;

const isSmokeTest = process.argv.includes(SMOKE_TEST_FLAG);

function finishSmokeTest(code: number, reason: string): void {
  if (!isSmokeTest || smokeFinished) {
    return;
  }

  smokeFinished = true;
  console.log(`[desktop smoke] ${reason}`);
  app.exit(code);
}

function registerApplicationSecurity(trustedOrigin: string): void {
  app.on("web-contents-created", (_event, contents) => {
    protectWebContents(contents, trustedOrigin);
  });

  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });

  ses.setPermissionCheckHandler(() => false);
}

function protectWebContents(
  contents: WebContents,
  trustedOrigin: string,
): void {
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  contents.on("will-navigate", (event, navigationUrl) => {
    handleMainFrameNavigation(event, navigationUrl, trustedOrigin);
  });

  contents.on("will-redirect", (event, navigationUrl) => {
    if (!isTrustedNavigationUrl(navigationUrl, trustedOrigin)) {
      event.preventDefault();
    }
  });

  contents.on("will-frame-navigate", (event) => {
    if (event.isMainFrame) {
      return;
    }

    if (!isTrustedNavigationUrl(event.url, trustedOrigin)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler((details: HandlerDetails) => {
    handleWindowOpen(details.url, trustedOrigin);
    return { action: "deny" };
  });
}

function handleMainFrameNavigation(
  event: ElectronEvent,
  navigationUrl: string,
  trustedOrigin: string,
): void {
  if (isTrustedNavigationUrl(navigationUrl, trustedOrigin)) {
    return;
  }

  event.preventDefault();

  if (isSafeExternalUrl(navigationUrl)) {
    openExternalSafely(navigationUrl);
  }
}

function handleWindowOpen(url: string, trustedOrigin: string): void {
  if (isTrustedNavigationUrl(url, trustedOrigin)) {
    return;
  }

  if (isSafeExternalUrl(url)) {
    openExternalSafely(url);
  }
}

function createMainWindow(appUrl: URL): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: WINDOW_BACKGROUND,
    title: PRODUCT_NAME,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });

  win.setMenuBarVisibility(false);

  win.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, _description, _url, isMainFrame) => {
      if (!isMainFrame || errorCode === ABORTED_ERROR_CODE) {
        return;
      }

      if (isSmokeTest) {
        finishSmokeTest(0, `load failed with code ${errorCode}`);
        return;
      }

      void promptReload(win, appUrl, LOAD_ERROR_MESSAGE);
    },
  );

  win.webContents.on("did-finish-load", () => {
    const currentUrl = win.webContents.getURL();
    if (isTrustedNavigationUrl(currentUrl, getTrustedOrigin(appUrl))) {
      finishSmokeTest(0, "finished loading production URL");
    }
  });

  win.webContents.on(
    "render-process-gone",
    (_event, details: RenderProcessGoneDetails) => {
      if (details.reason === "clean-exit") {
        return;
      }

      if (isSmokeTest) {
        finishSmokeTest(1, `renderer gone: ${details.reason}`);
        return;
      }

      void promptReload(win, appUrl, CRASH_ERROR_MESSAGE);
    },
  );

  void win.loadURL(appUrl.href);
  return win;
}

async function promptReload(
  win: BrowserWindow,
  appUrl: URL,
  message: string,
): Promise<void> {
  if (handlingLoadError || win.isDestroyed()) {
    return;
  }

  handlingLoadError = true;

  if (!win.isVisible()) {
    win.show();
  }

  const { response } = await dialog.showMessageBox(win, {
    type: "warning",
    title: PRODUCT_NAME,
    message,
    buttons: ["Tentar novamente", "Sair"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  handlingLoadError = false;

  if (win.isDestroyed()) {
    return;
  }

  if (response === 0) {
    void win.loadURL(appUrl.href);
    return;
  }

  app.quit();
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.setName(PRODUCT_NAME);
  app.setAppUserModelId(APP_ID);
  app.enableSandbox();
  Menu.setApplicationMenu(null);

  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  void app.whenReady().then(() => {
    let appUrl: URL;

    try {
      appUrl = resolveAppUrl(process.env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "URL inválida.";

      if (isSmokeTest) {
        console.error(message);
        app.exit(1);
        return;
      }

      dialog.showErrorBox(PRODUCT_NAME, message);
      app.quit();
      return;
    }

    registerApplicationSecurity(getTrustedOrigin(appUrl));
    mainWindow = createMainWindow(appUrl);

    if (isSmokeTest) {
      setTimeout(() => {
        finishSmokeTest(0, "timed out waiting for load (window was created)");
      }, SMOKE_TEST_TIMEOUT_MS);
    }
  });
}
