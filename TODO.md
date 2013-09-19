Trucs à installer
=================

  * ORM
    - https://github.com/dresende/node-orm2 ou http://sequelizejs.com/documentation ?
    - https://github.com/mranney/node_redis
  * Truc style Turbolinks ?
    - https://github.com/hackwaly/pjax-middleware ou https://github.com/dakatsuka/express-pjax ?

Étapes de dev
=============

  6. Module de déroulement d'un quiz
      1. Lancement en cours : notif "quiz_init", reset complet des joueurs, etc.
      2. Page d'attente pour les joueurs, authentifiée Passport, etc.  Réaction à l'init et auto-join.  Notifié sur la page back d'init.
      -- fin étape --
      3. Lancement du quiz (verrouille les joins)
      4. Init de question : notif "question_start" aux joueurs, chrono de fin côté serveur, stockage état dans Redis (et màj à chaque seconde qui passe).  Log en couleurs au lancement.
      5. Page de question joueur : rendering, chrono côté joueur, toggling réponse avec envoi WS à la volée, verrouillage post-chrono, etc.
      6. Serveur en réception de réponse : événement interne "new_answer" ou "edit_answer", stockage Redis.
      7. Fin de question : notif "question_end" avec bonne(s) réponse(s) et stats. Attente manip back pour question suivante. Stockage Redis. Log en couleurs.  Le dashboard back maintient 10 avatars (_.sample ou commande dédiée Redis) de joueurs par score pour le Top-5.
      8. Fin de quizz (dernière question finie) : notif "quiz_end" avec quelques stats.  Le module fournit une méthode d'accès au classement complet.  Chaque WS se prend la notif avec le classement du joueur et son score.  Stockage Redis.  Page dédiée du dashboard.
      -- fin étape --
  7. Tests (à entrelacer dans 5 et 6)
      1. Création d'un quiz
      2. Création d'une question
      3. Suppression d'une question
      4. Validations d'un des modèles
      5. Lancement de question -> bon rendering côté client
      6. Envoi de réponse -> bonne perception côté serveur
  8. CLI
      1. Possibilité de lancer avec un quiz en init auto, un passage auto à question suivante après un certain délai, de préloader un quiz depuis un JSON, etc.
      2. Production du man correspondant à l'aide de marked-man et de npm install -g, par exemple.
      -- fin étape --
  9. Module d'interfaçage Arduino ; repose sur les notifs du module de déroulé
      1. LCD : état en cours (init quiz avec nombre de joins, question X en cours avec répartition des réponses, et en fin de question les réparts et la/les correcte(s))
      2. Diodes : en fin de question, selon valeurs de réponses (vert >= 67%, jaune 34-66%, rouge <=33%)
      3. Buzzer : à chaque réponse, et selon la réponse (A/B/C/D) ; reprendre les dialtones FV pour plus de familiarité.

Docs à pondre
=============

  * README.md
  * Schéma Fritzing (?) de wiring de l'Arduino
  * .travis.yml ?
