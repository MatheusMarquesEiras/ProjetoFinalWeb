from flask import request, jsonify, session, Response
from werkzeug.security import check_password_hash, generate_password_hash
from backend.classes import ServerOllama
from backend.logs import Logger
from datetime import datetime, timezone
import json

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_session import Session

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_secret_key'

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = 'False'

Session(app)

CORS(app, supports_credentials=True, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174",
        ]
    }
})

db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    conversations = db.relationship('Conversation', back_populates='user', lazy=True)

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', back_populates='conversations')
    phases = db.relationship('Phase', back_populates='conversation', lazy=True)

class Phase(db.Model):
    __tablename__ = 'phases'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
    content = db.Column(db.Text, nullable=False)
    speaker = db.Column(db.String, nullable=False)

    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    conversation = db.relationship('Conversation', back_populates='phases')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data['username']
    password = generate_password_hash(data['password'])

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'User already exists'}), 400

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        session['user'] = user.username
        session['user_id'] = user.id
        a = session['user']
        b = session['user_id']
        Logger.info(f'session username: {a}')
        Logger.info(f'session id: {b}')
        return jsonify({'message': 'Login successful'})
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/check-session', methods=['GET'])
def check_session():
    if 'user' in session:
        a = session.get('user')
        b = session.get('user_id')
        Logger.info(f"check session: ")
        Logger.info(f'session username: {a}')
        Logger.info(f'session id: {b}')
        return jsonify({'username': session['user']})
    return jsonify({'message': 'Not logged in'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    response = jsonify({'message': 'Logged out'})
    response.set_cookie('session', '', expires=0)
    return response

Server = ServerOllama()

@app.route('/gen', methods=['POST', 'GET'])
def gen():

    if request.method == 'POST':
        data = request.json
        text_user = data.get('text_user', '')
        new_conversation = data.get('new_conversation', False)

        Logger.info(f"POST /gen - Received text_user: {text_user}")
        Logger.info(f"POST /gen - Received new_conversation: {new_conversation}")

        if 'user_id' not in session:
            Logger.error("POST /gen - User ID not found in session")
            return jsonify({"error": "User session missing"}), 403

        if new_conversation:
            try:
                new_conv = Conversation(title=make_title(), user_id=session['user_id'])
                db.session.add(new_conv)
                db.session.commit()

                new_phase = Phase(conversation_id=new_conv.id, content=text_user, speaker='user')
                db.session.add(new_phase)
                db.session.commit()

                session['id_conv'] = new_conv.id
                Logger.info(f"POST /gen - New conversation created: {new_conv.id}")

                return jsonify({"message": "Text received, SSE ready", "conversation_id": new_conv.id}), 200
            except Exception as e:
                db.session.rollback()
                Logger.error(f"Error creating conversation: {str(e)}")
                return jsonify({"error": "Failed to create conversation"}), 500

        conversation_id = session.get('id_conv')
        Logger.info(f"conversation_id: {conversation_id}")
        if not conversation_id:
            Logger.error("POST /gen - Conversation ID not found in session")
            return jsonify({"error": "No active conversation"}), 403

        new_phase = Phase(conversation_id=conversation_id, content=text_user, speaker='user')
        db.session.add(new_phase)
        db.session.commit()

        return jsonify({"message": "Text received, SSE ready", "conversation_id": conversation_id , "text_user":text_user}), 200 

    elif request.method == 'GET':
        conversation_id = request.args.get('conversation_id')

        if not conversation_id:
            return jsonify({"error": "Missing required parameters"}), 400

        all_previus_mensages = Phase.query.with_entities(Phase.content, Phase.speaker).filter_by(conversation_id=conversation_id).order_by(Phase.created_at).all()
        list_entities = [{'content': item.content, 'role': "assistant" if item.speaker == "ai" else item.speaker} for item in all_previus_mensages]
        Logger.info(f"list_entities: {list_entities}")

        try:
            stream = Server.stream_server_request_response(conversation=list_entities)

            def generate():
                full_ai_text = ''
                try:
                    for chunk in stream:
                        if not chunk.get('done', False):
                            message_content = chunk['message']['content']
                            message = {"message": message_content, "done": False}
                            full_ai_text += message_content
                            yield f"data: {json.dumps(message)}\n\n"
                        else:
                            done_message = {"message": "", "done": True}
                            yield f"data: {json.dumps(done_message)}\n\n"
                finally:
                    with app.app_context():
                        new_phase = Phase(conversation_id=conversation_id, content=full_ai_text, speaker='ai')
                        db.session.add(new_phase)
                        db.session.commit()
                        Logger.info(f"GET /gen - Phase created after streaming")


            return Response(generate(), content_type='text/event-stream')

        except Exception as e:
            Logger.error(f"GET /gen - Error occurred for error: {str(e)}")
            return jsonify({"error": "An error occurred"}), 500


    
@app.route('/pull-model', methods=['POST'])
def pull_local_model():
    data = request.json
    model_name = data['model_name']
    try:
        Server.pull_model(model_name)
        return jsonify({'success': True})
    except:
        return jsonify({'success': False})
    
@app.route('/list-models', methods=['GET'])
def list_local_models():
    models = Server.list_models()
    
    return jsonify({"local_models": models})

@app.route('/set-model', methods=['POST'])
def set_model():

    data = request.json
    Server.set_model(model=data['model'])

    return jsonify({'setted_model': Server.try_chat()})

@app.route('/get-current-model', methods=['GET'])
def get_current_model():
    return jsonify({'current_model': Server.get_model()})

@app.route('/delete-model', methods=['POST'])
def delete_model():
    data = request.json
    
    return jsonify({'deleted': Server.delete_model(data['model_name'])})

@app.route('/get_titles', methods=['GET'])
def get_titles():
    s = session['user_id']
    Logger.info(f'id usuario: {s}')
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User not logged in'}), 401
        
        user_convs = Conversation.query.filter_by(user_id=session['user_id']).all()

        conv_titles = [{'id': conv.id, 'title': conv.title} for conv in user_convs]
        Logger.info(f"conv_titles: {conv_titles}")
        return jsonify({'titles': conv_titles})

    except Exception as e:
        Logger.error(f"Erro ao obter os títulos: {e}")
        return jsonify({'error': 'An error occurred while fetching titles'}), 500

@app.route('/get-history', methods=['POST'])
def get_history():
    data = request.json
    try:
        history = Phase.query.with_entities(Phase.content, Phase.speaker).filter_by(conversation_id=data['conv_id']).order_by(Phase.created_at).all()
        history_list = [{"content": item.content, "type": item.speaker} for item in history]

        return jsonify({"history": history_list}), 200
    except Exception as e:

        Logger.error(f"Database error: {e}")
        return jsonify({"error": "Could not fetch history"}), 500
    
def make_title():
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase, k=3))

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

        username = "teste"
        existing_user = User.query.filter_by(username=username).first()

        if not existing_user:
            hashed_password = generate_password_hash("teste", method='pbkdf2:sha256')
            new_user = User(username=username, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()

    app.run()
