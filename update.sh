#!/bin/bash

cd `dirname $0`

echo -n "Fetch supported locales..."
curl -LOs http://www.facebook.com/translations/FacebookLocales.xml
echo " done"

locales=(`cat FacebookLocales.xml | grep representation | sed -e "s/<[^>]*>//g"`)

for locale in ${locales[@]}; do
  if [ ! -d $locale ]
  then
    mkdir $locale
  fi

  echo -n "Updating $locale.."

  curl -s -L "https://connect.facebook.net/$locale/all/debug.js" | sed -e "1,1d" > "$locale/debug.js"
  echo -n "."
  curl -s -L "https://connect.facebook.net/$locale/all.js" | sed -e "1,1d" > "$locale/all.js"

  echo " done"
done

git diff-files --quiet

if [ $? -ne 0 ]; then
  echo "Detect updated files."
  git commit -aq -m "`date -Ru`"
  git push origin master
else
  echo "Nothing to update. finish."
fi
