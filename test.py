from werkzeug.security import generate_password_hash
from run import db, User, app

with app.app_context():
    # Use o método correto: 'pbkdf2:sha256'
    hashed_password = generate_password_hash("your_password", method='pbkdf2:sha256')
    new_user = User(email="test@example.com", password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    print("Usuário criado com sucesso!")
