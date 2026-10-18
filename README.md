# Équipements sportifs de Corbas — créneaux & manifestations

Site unique qui fusionne **Créneaux des Équipements de Corbas** (créneaux réguliers à l'année) et **Planning Manifestations – Corbas** (manifestations ponctuelles, surtout le week-end).

## Pages

| Page | Rôle |
|---|---|
| `index.html` | Accueil : deux entrées **Associations** / **Administrateurs**. Menu de l'association (choix de la saison, créneaux, manifestations, mot de passe). Réglages communs de l'administrateur : saisons et ouverture, associations, documents à télécharger, adresses mail, code administrateur. |
| `creneaux.html` | Créneaux à l'année (mêmes menus qu'avant : saisie, consultation, plannings, taux d'occupation, bilan des heures, équipements & salles). |
| `manifestations.html` | Manifestations : formulaire « Saisir votre manifestation », « Modifier vos demandes », « Consulter le planning », « Consulter vos impacts » ; planning administrateur, bilans, extraction. |
| `commun.js` | Connexion à la base, session, saisons (partagé par les trois pages). |

La connexion se fait une seule fois sur l'accueil ; la session est gardée dans l'onglet (jamais le mot de passe).

## Base de données (Supabase, projet `nvufzwdwhearlwdcezsn`)

Le site fusionné utilise ses **propres tables** : les anciens sites et leurs tables (`planning`, `creneaux`, `settings`) ne sont pas modifiés.

| Table | Contenu |
|---|---|
| `fu_saisons` | Une ligne par saison : planning des manifestations (septembre → août) et deux interrupteurs indépendants `creneaux_ouvert` / `manif_ouvert`. |
| `fu_creneaux` | Créneaux à l'année, par saison. |
| `fu_reglages` | Liste unique des associations (`cfg_assos`), équipements & salles (`cfg_lieux`), taux, bilan, couleurs, salles municipales, adresses mail. |
| `fu_documents` | Documents à télécharger (officialisation, demande de matériel). |
| `fu_mails` | Journal des mails automatiques (illisible depuis le site). |
| `app.fu_comptes` | Mots de passe (empreintes bcrypt), hors de l'API publique. |

Sécurité : les tables sont en lecture seule pour le public ; **toute écriture passe par une fonction `fu_*` qui vérifie le jeton de session** (rôle administrateur ou association, l'association ne pouvant modifier que ses propres lignes, et seulement quand la saisie est ouverte). Les suppressions sont « douces » (lignes masquées, récupérables).

## Mail automatique

À chaque nouvelle demande de manifestation d'une association, la fonction `supabase/functions/fusion-mail` envoie un mail à l'adresse réglée dans le menu administrateur (par défaut sports@ville-corbas.fr). Le message est composé par le serveur à partir de la base : la fonction ne peut pas servir de relais pour envoyer d'autres mails.

Elle a besoin du secret **`RESEND_API_KEY`** (Supabase → Edge Functions → Secrets). Tant que le domaine n'est pas vérifié chez Resend, l'expéditeur `onboarding@resend.dev` ne peut écrire qu'à l'adresse du compte Resend ; on peut changer l'expéditeur avec le secret `RESEND_FROM`.
