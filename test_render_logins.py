import urllib.request, json

base = 'https://loanguard-ai-uql9.onrender.com'
emails = [
    ('aditya.raj@gmail.com', 'password123'),
    ('operator@loanguard.ai', 'operator123'),
    ('rajesh.menon@loanguard.ai', 'password123'),
    ('reviewer@loanguard.ai', 'reviewer123'),
    ('alex.morgan@loanguard.ai', 'password123'),
    ('ananya.iyer@loanguard.ai', 'password123'),
    ('consumer@loanguard.ai', 'consumer123'),
]

for email, pwd in emails:
    try:
        req = urllib.request.Request(
            f'{base}/api/login',
            data=json.dumps({'email': email, 'password': pwd}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            user = data.get('user', {})
            print(f"SUCCESS: {email} | Role: {user.get('role')} | Name: {user.get('name')}")
    except Exception as e:
        print(f"FAILED: {email} ({e})")
