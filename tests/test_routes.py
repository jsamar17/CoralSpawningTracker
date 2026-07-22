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
    assert '<select' in html


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


def test_list_submissions_empty():
    client = app.test_client()
    resp = client.get('/api/submissions')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['success'] is True
    assert body['submissions'] == []
    assert body['count'] == 0


def test_list_submissions_returns_all():
    client = app.test_client()
    client.post('/api/submit', json=_make_payload())
    client.post('/api/submit', json=_make_payload(species='cytherea'))
    resp = client.get('/api/submissions')
    body = resp.get_json()
    assert body['success'] is True
    assert body['count'] == 2


def test_list_submissions_filter_by_submitter():
    client = app.test_client()
    client.post('/api/submit', json=_make_payload(submitted_by='alice'))
    client.post('/api/submit', json=_make_payload(species='cytherea', submitted_by='bob'))
    client.post('/api/submit', json=_make_payload(species='verrucosa', submitted_by='alice'))

    resp_alice = client.get('/api/submissions?submitter=alice')
    body_alice = resp_alice.get_json()
    assert body_alice['count'] == 2

    resp_bob = client.get('/api/submissions?submitter=bob')
    body_bob = resp_bob.get_json()
    assert body_bob['count'] == 1

    resp_none = client.get('/api/submissions?submitter=carol')
    body_none = resp_none.get_json()
    assert body_none['count'] == 0


def test_search_page_has_submissions_toggle():
    client = app.test_client()
    resp = client.get('/')
    html = resp.data.decode()
    assert 'id="include-submissions-toggle"' in html


def test_debug_page_renders():
    client = app.test_client()
    resp = client.get('/debug')
    assert resp.status_code == 200
    html = resp.data.decode()
    assert 'id="debug-map"' in html
    assert 'id="seed-btn"' in html
    assert 'id="clear-btn"' in html


def test_debug_seed():
    client = app.test_client()
    records = [
        {'genus': 'Acropora', 'species': 'millepora', 'location': 'R1',
         'latitude': -15.0, 'longitude': 147.0, 'date': '2024-01-01'},
        {'genus': 'Porites', 'species': 'lobata', 'location': 'R2',
         'latitude': -15.1, 'longitude': 147.1, 'date': '2024-02-01'},
    ]
    resp = client.post('/api/debug/seed', json={'submissions': records})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['success'] is True
    assert body['count'] == 2
    assert len(s.load_submissions()) == 2


def test_debug_seed_empty():
    client = app.test_client()
    resp = client.post('/api/debug/seed', json={})
    assert resp.status_code == 400


def test_debug_clear():
    client = app.test_client()
    client.post('/api/submit', json=_make_payload())
    client.post('/api/submit', json=_make_payload(species='cytherea'))
    assert len(s.load_submissions()) == 2
    resp = client.post('/api/debug/clear')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
    assert len(s.load_submissions()) == 0


def test_delete_submission():
    client = app.test_client()
    resp = client.post('/api/submit', json=_make_payload())
    sub_id = resp.get_json()['submission']['id']
    resp = client.delete(f'/api/submissions/{sub_id}')
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
    assert len(s.load_submissions()) == 0


def test_delete_submission_not_found():
    client = app.test_client()
    resp = client.delete('/api/submissions/nonexistent-id')
    assert resp.status_code == 404
