import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services import submission_service as s


def setup_function():
    s.clear_user_data()


def _make_submission(**overrides):
    data = {
        'genus': 'Acropora',
        'species': 'millepora',
        'location': 'Test Reef',
        'latitude': -15.0,
        'longitude': 147.0,
        'date': '2024-01-15',
        'start_time': '20:00',
        'end_time': '21:00',
        'days_after_full_moon': 3,
        'gamete_release': 'Sperm',
        'situation': 'In situ',
        'timezone': '10.0',
        'reference': 'Test Ref',
        'image_url': '',
        'submitted_by': 'tester',
    }
    data.update(overrides)
    return data


def test_add_submission():
    sub = s.add_submission(_make_submission())
    assert sub['id'] is not None
    assert sub['submitted_at'] is not None
    assert sub['genus'] == 'Acropora'


def test_load_submissions():
    s.add_submission(_make_submission())
    s.add_submission(_make_submission(species='cytherea'))
    records = s.load_submissions()
    assert len(records) == 2


def test_get_submission():
    sub = s.add_submission(_make_submission())
    fetched = s.get_submission(sub['id'])
    assert fetched is not None
    assert fetched['species'] == 'millepora'


def test_get_submission_unknown_id():
    assert s.get_submission('nonexistent-id') is None


def test_update_submission():
    sub = s.add_submission(_make_submission())
    updated = s.update_submission(sub['id'], {'species': 'cytherea'})
    assert updated['species'] == 'cytherea'
    assert updated['genus'] == 'Acropora'
    assert s.get_submission(sub['id'])['species'] == 'cytherea'


def test_update_submission_unknown_id():
    result = s.update_submission('nonexistent-id', {'species': 'x'})
    assert result is None


def test_delete_submission():
    sub = s.add_submission(_make_submission())
    assert s.delete_submission(sub['id']) is True
    assert len(s.load_submissions()) == 0


def test_delete_submission_unknown_id():
    assert s.delete_submission('nonexistent-id') is False


def test_clear_user_data():
    s.add_submission(_make_submission())
    s.add_submission(_make_submission(species='cytherea'))
    assert len(s.load_submissions()) == 2
    s.clear_user_data()
    assert len(s.load_submissions()) == 0


def test_add_generates_uuid():
    sub1 = s.add_submission(_make_submission())
    sub2 = s.add_submission(_make_submission())
    assert sub1['id'] != sub2['id']


def test_malformed_json_recovery():
    with open(s.DATA_FILE, 'w') as f:
        f.write('{invalid json')
    try:
        s.load_submissions()
    except json.JSONDecodeError:
        pass
    s.clear_user_data()
    assert s.load_submissions() == []


def test_seed_submissions():
    records = [
        {'genus': 'Acropora', 'species': 'millepora', 'location': 'R1',
         'latitude': -15.0, 'longitude': 147.0, 'date': '2024-01-01'},
        {'genus': 'Porites', 'species': 'lobata', 'location': 'R2',
         'latitude': -15.1, 'longitude': 147.1, 'date': '2024-02-01'},
    ]
    count = s.seed_submissions(records)
    assert count == 2
    subs = s.load_submissions()
    assert len(subs) == 2
    assert all(sub['id'] is not None for sub in subs)
    assert all(sub['submitted_at'] is not None for sub in subs)


def test_seed_submissions_appends():
    s.add_submission(_make_submission())
    s.seed_submissions([
        {'genus': 'Porites', 'species': 'lobata', 'location': 'R1',
         'latitude': -15.0, 'longitude': 147.0, 'date': '2024-01-01'}
    ])
    assert len(s.load_submissions()) == 2
