#!/bin/bash
echo "Starting security scan..."
echo "--------------------------"

echo "Checking for hardcoded emails/credentials..."
rg "etcsuporte889@gmail.com|@hotmail.com|@outlook.com" -g "!node_modules/*" -g "!.git/*"

echo "Checking for service role key usage in frontend..."
rg "SUPABASE_SERVICE_ROLE_KEY" src/

echo "Checking for dangerouslySetInnerHTML without DOMPurify..."
grep -r "dangerouslySetInnerHTML" src/ | grep -v "DOMPurify.sanitize"

echo "Checking for potential JWT verification bypasses in config..."
grep "verify_jwt = false" supabase/config.toml

echo "Checking for unauthenticated Edge Functions..."
# We expect all functions to import requireUserAuth
for func in supabase/functions/*/; do
  if [ -d "$func" ] && [ "$(basename "$func")" != "_shared" ]; then
    if ! grep -q "requireUserAuth" "${func}index.ts"; then
      echo "WARNING: Function $(basename "$func") might be missing authentication check."
    fi
  fi
done

echo "--------------------------"
echo "Scan complete."
