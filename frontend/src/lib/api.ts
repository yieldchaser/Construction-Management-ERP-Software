export const getApiHost = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.startsWith("192.168.")) {
      return "https://construction-erp-backend-73vm.onrender.com";
    }
  }
  return "http://localhost:8000";
};
