import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import app
from services import submission_service as s


def setup_function():
    s.clear_user_data()


def _make_payload(**overrides):
    data = {
        'genus': 'Acropora',
        'species': 'millepora',
        'location': 'Test Reef',
        'latitude': -15.0,
        'longitude': 147.0,
        'date': '2024-01-15',
    }
    data.update(overrides)
    return data


def test_submit_form_renders():
    client = app.test_client()
    resp = client.get('/submit')
    assert resp.status_code == 200


def test_submit_observation_success():
    client = app.test_client()
    resp = client.post('/api/submit', json=_make_payload())
    assert resp.status_code == 201
    body = resp.get_json()
    assert body['success'] is True
    assert body['submission']['id'] is not None
    assert body['submission']['genus'] == 'Acropora'


def test_submit_observation_missing_fields():
    client = app.test_client()
    resp = client.post('/api/submit', json={'genus': 'Acropora'})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body['success'] is False
    assert 'Missing required fields' in body['error']


def test_submit_observation_empty_body():
    client = app.test_client()
    resp = client.post('/api/submit', json={})
    assert resp.status_code == 400


def test_submit_observation_persists():
    client = app.test_client()
    client.post('/api/submit', json=_make_payload())
    client.post('/api/submit', json=_make_payload(species='cytherea'))
    assert len(s.load_submissions()) == 2


def test_submit_page_contains_form_fields():
    client = app.test_client()
    resp = client.get('/submit')
    html = resp.data.decode()
    assert 'id="genus"' in html
    assert 'id="species"' in html
    assert 'id="location-name"' in html
    assert 'id="obs-date"' in html
    assert 'id="submit-map"' in html
    assert 'id="submit-btn"' in html
    assert 'id="genus-list"' in html
    assert 'id="species-list"' in html


def test_submit_observation_full_payload():
    client = app.test_client()
    payload = _make_payload(
        start_time='20:30',
        end_time='21:00',
        days_after_full_moon=3,
        gamete_release='Sperm',
        situation='In situ',
        reference='Test Ref 2024',
        submitted_by='tester',
    )
    resp = client.post('/api/submit', json=payload)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body['submission']['start_time'] == '20:30'
    assert body['submission']['days_after_full_moon'] == 3
    assert body['submission']['submitted_by'] == 'tester'
