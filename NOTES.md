# some notes

## zip for Chrome Extension upload
zip -r gslocation.v3.7.zip ./gslocation/ \
  -x "*/.DS_Store" \
  -x "*/.git/*" \
  -x "*/.gitignore" \
  -x "*/.handlebars" \
  -x "*.md"
