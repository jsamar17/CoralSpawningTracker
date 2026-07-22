import json
import os
import tempfile
import uuid
from datetime import datetime, timezone

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'user_submissions.json')


def _ensure_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump([], f)


def _read_all():
    _ensure_file()
    with open(DATA_FILE, 'r') as f:
        return json.load(f)


def _write_all(records):
    dir_path = os.path.dirname(DATA_FILE)
    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix='.json')
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(records, f, indent=2)
        os.replace(tmp_path, DATA_FILE)
    except BaseException:
        os.unlink(tmp_path)
        raise


def load_submissions():
    return _read_all()


def get_submission(submission_id):
    for record in _read_all():
        if record.get('id') == submission_id:
            return record
    return None


def add_submission(data):
    records = _read_all()
    submission = {
        'id': str(uuid.uuid4()),
        'genus': data.get('genus', ''),
        'species': data.get('species', ''),
        'location': data.get('location', ''),
        'latitude': data.get('latitude', 0.0),
        'longitude': data.get('longitude', 0.0),
        'date': data.get('date', ''),
        'start_time': data.get('start_time', ''),
        'end_time': data.get('end_time', ''),
        'days_after_full_moon': data.get('days_after_full_moon'),
        'gamete_release': data.get('gamete_release', ''),
        'situation': data.get('situation', 'In situ'),
        'timezone': data.get('timezone', ''),
        'reference': data.get('reference', ''),
        'image_url': data.get('image_url', ''),
        'submitted_by': data.get('submitted_by', ''),
        'submitted_at': datetime.now(timezone.utc).isoformat(),
    }
    records.append(submission)
    _write_all(records)
    return submission


def update_submission(submission_id, data):
    records = _read_all()
    for i, record in enumerate(records):
        if record.get('id') == submission_id:
            updatable = [
                'genus', 'species', 'location', 'latitude', 'longitude',
                'date', 'start_time', 'end_time', 'days_after_full_moon',
                'gamete_release', 'situation', 'timezone', 'reference',
                'image_url', 'submitted_by',
            ]
            for field in updatable:
                if field in data:
                    records[i][field] = data[field]
            _write_all(records)
            return records[i]
    return None


def delete_submission(submission_id):
    records = _read_all()
    new_records = [r for r in records if r.get('id') != submission_id]
    if len(new_records) == len(records):
        return False
    _write_all(new_records)
    return True


def clear_user_data():
    _write_all([])


def seed_submissions(records):
    existing = _read_all()
    for rec in records:
        rec['id'] = str(uuid.uuid4())
        rec.setdefault('submitted_by', '')
        rec.setdefault('submitted_at', datetime.now(timezone.utc).isoformat())
        existing.append(rec)
    _write_all(existing)
    return len(records)
