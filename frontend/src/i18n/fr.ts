export default {
  topbar: {
    login: "Connexion",
    editProfile: "Modifier Profil",
    logout: "Déconnexion",
  },

  menu: {
    title: "PONG",
    playGame: "Lancer le Jeu",
    tournaments: "Tournois",
    localMatch: "Combat Local",
    onlineMatch: "Duel en Ligne",
  },

  game: {
    exit: "Quitter le Match",
  },

  tournaments: {
    title: "Tournois",
    back: "← Retour",
    loading: "Chargement…",
    none: "Aucun tournoi.",
    available: (n: number) => `${n} Tournois Prêts`,
    create: "+ Créer un Tournoi",
    details: "Détails",
    join: "Rejoindre",
    failed: "Erreur de chargement.",
    semiFinals: "Demi-finales",
    finalMatch: "Finale",
    thirdPlaceFinal: "3e Place + Finale",
    roundComplete: "Round terminé",
    tournamentFinished: "Tournoi terminé",
    thirdPlaceDecided: "3e Place décidée",
    nameLabel: "Nom du tournoi",
    namePlaceholder: "Entrez le nom du tournoi (optionnel)",
    nameError: "Seuls les caractères alphanumériques sont autorisés",
    displayNameLabel: "Votre nom d'affichage",
    displayNamePlaceholder: "Entrez votre nom d'affichage (optionnel)",
  },

  auth: {
    welcome: "Bienvenue Challenger",
    login: "Connexion",
    register: "Inscription",
    username: "Nom d'utilisateur",
    password: "Mot de passe",

    errUsernameRequired: "Nom requis",
    errPasswordShort: "Mot de passe trop court",
    errFixForm: "Corrigez les erreurs.",
    errAuthFailed: "Échec de connexion.",
    errGeneric: "Erreur",
    loginGitHub: "Se connecter avec GitHub",
  },

  profile: {
    title: "Profil",
    backToMenu: "Retour au menu",
    loading: "Chargement du profil…",
    notLoggedIn: "Vous n’êtes pas connecté.",
    joined: "Inscrit le : ",
    changePassword: "Changer le mot de passe",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    savePassword: "Enregistrer le mot de passe",
    passwordsNoMatch: "Les mots de passe ne correspondent pas.",
    passwordTooShort: "Le mot de passe doit contenir au moins 4 caractères.",
    saved: "Enregistré !",
    updateFailed: "Échec de la mise à jour.",
    friends: "Amis",
    noFriends: "Aucun ami ajouté."
  },
  
    gameOver: {
    leftWins: "Le joueur gauche gagne !",
    rightWins: "Le joueur droit gagne !",
    refresh: "Match terminé",
    replay: "Rejouer le match",
    },

    online: {
  title: "Parties en ligne",
  loading: "Chargement des parties ouvertes…",
  createGame: "Créer une nouvelle partie",
  none: "Aucune partie ouverte",
  available: "Parties disponibles: ",
  join: "Rejoindre",
  game: "Partie"
  },

    userProfile: {
    title: "Profil utilisateur",
    loading: "Chargement du profil...",
    joined: "Inscrit le : ",
    addFriend: "Ajouter comme ami",
    removeFriend: "Retirer des amis",
    block: "Bloquer",
    unblock: "Débloquer",
    youBlocked: "Vous avez bloqué ",
    youUnblocked: "Vous avez débloqué ",
    friends: "Amis",
    noFriends: "Aucun ami.",
    failedLoad: "Échec du chargement du profil."
  },

};
