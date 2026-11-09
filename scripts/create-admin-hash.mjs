import crypto from 'node:crypto';

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
  console.error('Jalankan script ini langsung di terminal interaktif agar password tidak tampil.');
  process.exit(1);
}

const chunks = [];
process.stdout.write('Masukkan password admin (minimal 12 karakter): ');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', chunk => {
  for (const byte of chunk) {
    if (byte === 3) {
      process.stdin.setRawMode(false);
      process.exit(1);
    }
    if (byte === 13 || byte === 10) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      const password = Buffer.concat(chunks).toString('utf8');
      if (password.length < 12) {
        console.error('Password harus minimal 12 karakter.');
        process.exit(1);
      }
      const salt = crypto.randomBytes(18);
      crypto.pbkdf2(password, salt, 210000, 32, 'sha256', (error, hash) => {
        if (error) {
          console.error('Gagal membuat hash password.');
          process.exit(1);
        }
        console.log(`Hash untuk kolom passwordHash:\npbkdf2$210000$${salt.toString('base64url')}$${hash.toString('base64url')}`);
      });
      return;
    }
    if (byte === 8 || byte === 127) {
      if (chunks.length) chunks.pop();
      continue;
    }
    chunks.push(Buffer.from([byte]));
  }
});
