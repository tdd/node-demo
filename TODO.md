Étapes de dev
=============

  >>> 6. Module de déroulement d'un quiz
      5. Page de question joueur :
         - rendering côté joueur
         - chrono côté joueur
         - toggling réponse avec envoi WS à la volée (on peut changer d'avis jusqu'à la fin)
      6. Serveur en réception de réponse :
         - stockage/màj Redis
         - événement interne "new-answer" ou "edit-answer"
      7. Fin de question :
         - notif "question-end" avec bonne(s) réponse(s) et stats.
         - Stockage Redis compound data + màj scores joueurs (reset à zéro en début de quiz, au fait, et reset des compound aussi)
         - Attente manip back pour question suivante.
         - Log en couleurs.
         - Le dashboard back maintient 10 avatars (_.sample ou commande dédiée Redis) de joueurs par score pour le Top-5.
      8. Fin de quizz (dernière question finie) :
         - notif "quiz-end" avec quelques stats.
         - Le module fournit une méthode d'accès au classement complet.
         - Chaque WS se prend la notif avec le classement du joueur et son score (on a besoin de binder la WS au joueur, au fait…)
         - Page dédiée du dashboard.
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
