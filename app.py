import os
import logging

from flask import Flask, render_template

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get(
    "SESSION_SECRET", "dev-secret-key-for-coral-spawning"
)


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


# Import routes after app creation to avoid circular imports
# noqa: E402 — intentional late import
import routes  # noqa: E402

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
