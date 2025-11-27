export default {
  topbar: {
    login: "Login",
    editProfile: "Edit Profile",
    logout: "Logout",
  },

  menu: {
    title: "PONG",
    playGame: "Start Game",
    tournaments: "Tournaments",
    localMatch: "Local Match",
    onlineMatch: "Online Match",
  },

  game: {
    exit: "Exit Match",
  },

  tournaments: {
    title: "Tournaments",
    back: "← Back",
    loading: "Loading tournaments…",
    none: "No tournaments yet.",
    available: (n: number) => `${n} Tournaments Ready`,
    create: "+ Create Tournament",
    details: "Details",
    join: "Join",
    failed: "Failed to load tournaments.",
  },

  auth: {
    Pong: "PONG",
    login: "Login",
    register: "Register",
    username: "Username",
    password: "Password",

    errUsernameRequired: "Username required",
    errPasswordShort: "Password too short",
    errFixForm: "Please fix the errors.",
    errAuthFailed: "Authentication failed.",
    errGeneric: "Error",
    loginGitHub: "Sign in with GitHub",
  },

  profile: {
    title: "Edit Profile",
    backToMenu: "← Back to Menu",
    loading: "Loading…",
    notLoggedIn: "Not logged in.",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    saveChanges: "Save Changes",
    passwordsNoMatch: "Passwords do not match.",
    passwordTooShort: "Password too short.",
    saved: "Saved!",
    updateFailed: "Update failed.",
  },

    gameOver: {
    leftWins: "Left Player Wins!",
    rightWins: "Right Player Wins!",
    refresh: "Match Over",
    replay: "Replay Match",
    },

};
