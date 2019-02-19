import sessionManager from "../module/sessionManager";

export default (token: string) => {
  return sessionManager.main(token);
}
