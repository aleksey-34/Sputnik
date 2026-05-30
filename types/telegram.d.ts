export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { start_param?: string };
        platform?: string;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        viewportHeight: number;
        viewportStableHeight: number;
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        onEvent?: (event: string, handler: () => void) => void;
        offEvent?: (event: string, handler: () => void) => void;
        showAlert?: (message: string, callback?: () => void) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        close: () => void;
      };
    };
  }
}
