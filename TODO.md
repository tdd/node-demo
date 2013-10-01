Étapes de dev
=============

  9. Module d'interfaçage Arduino ; repose sur les notifs du module de déroulé
      1. LCD : état en cours (init quiz avec nombre de joins, question X en cours avec répartition des réponses, et en fin de question les réparts et la/les correcte(s))
      2. Diodes : en fin de question, selon valeurs de réponses (vert >= 67%, jaune 34-66%, rouge <=33%)
      3. Buzzer : à chaque réponse, et selon la réponse (A/B/C/D) ; reprendre les dialtones FV pour plus de familiarité.
  7. Tests (à entrelacer dans 5 et 6)
      1. Création d'un quiz
      2. Création d'une question
      3. Suppression d'une question
      4. Validations d'un des modèles
      5. Lancement de question -> bon rendering côté client
      6. Envoi de réponse -> bonne perception côté serveur
      -- fin étape --

Docs à pondre
=============

  * README.md
  * .travis.yml ?
