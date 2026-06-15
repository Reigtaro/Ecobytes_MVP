git # Siempre trabajar desde dev
git checkout dev

# Cuando termines cambios, commitear
git add .
git commit -m "scope: descripción del cambio"
git push origin dev

# Cuando dev esté estable y quieras pasar a main (release)
git checkout main
git merge dev
git push origin main

# Cuando un compañero haga cambios de dev a main, para reflejar los cambios podemos usar
git fetch origin
git merge origin/main

De este como estaremos actualizando todo nuestro proyecto de la rama dev.

Recomendación adicional: en GitHub puedes proteger la rama main para que no se pueda hacer push directo — solo via PR desde dev. Esto se configura en Settings → Branches → Branch protection rules.   

Si en algún momento quieres trabajar en una feature específica sin tocar dev:

git checkout dev
git checkout -b feature/nombre-feature
# ... trabajas ...
git push -u origin feature/nombre-feature
# Luego haces PR de feature/* → dev en GitHub