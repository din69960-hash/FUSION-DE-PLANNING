#!/bin/sh
# Construction du site pour Cloudflare Pages (gratuit).
# Ne publie QUE les fichiers du site : le code des fonctions serveur (supabase/), le README
# et ce script restent dans le dépôt privé et ne sont jamais servis au public.
set -e
rm -rf dist
mkdir -p dist
cp index.html creneaux.html manifestations.html commun.js sw.js manifest.webmanifest _headers dist/
cp -r icons dist/
echo "Site prêt dans dist/ :"; ls dist
