import os
import logging
from flask import Flask

# Configure logging
logging.basicConfig(level=logging.DEBUG)

from flask import render_template, send_from_directory

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-for-coral-spawning")

@app.route('/')
def index():
    return render_template('index.html')


# @app.route('/data/<path:filename>')
# def serve_data(filename):
#     return send_from_directory('data', filename)

# Import routes after app creation to avoid circular imports
import routes

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
