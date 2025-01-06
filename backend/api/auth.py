from flask import Blueprint, session

auth_blueprint = Blueprint('auth', __name__)

@auth_blueprint.before_request
def autenticated():
    if 'logged' not in session:
        session['logged'] = False

