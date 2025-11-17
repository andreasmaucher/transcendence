export default {
  topbar: {
    login: "Login",
    editProfile: "Edit Profile",
    logout: "Logout",
  },
  menu: {
    title: "PONG",
    playGame: "Play Game",
    tournaments: "Tournaments",
    localMatch: "Local Match",
    onlineMatch: "Online Match",
  },
  game: {
    exit: "Exit Game",
  },
  tournaments: {
    title: "Tournaments",
    back: "← Back",
    loading: "Loading tournaments…",
    none: "No tournaments yet.",
    available: (n: number) => `${n} Available Tournaments`,
    create: "+ Create Tournament",
    details: "Details",
    join: "Join",
    failed: "Failed to load tournaments.",
  },
  auth: {
    welcome: "Welcome",
    login: "Login",
    register: "Register",
    username: "Username",
    password: "Password",

    errUsernameRequired: "Username required",
    errPasswordShort: "Password too short",
    errFixForm: "Please fix the errors.",
    errAuthFailed: "Authentication failed.",
    errGeneric: "Error",
  },
};
