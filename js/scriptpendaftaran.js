// Animasi tombol saat muncul
document.addEventListener('DOMContentLoaded', function() {
	const buttons = document.querySelectorAll('.reg-btn');
	buttons.forEach((btn, i) => {
		btn.style.opacity = '0';
		btn.style.transform = 'scale(0.8)';
		setTimeout(() => {
			btn.style.transition = 'opacity 0.6s, transform 0.6s';
			btn.style.opacity = '1';
			btn.style.transform = 'scale(1)';
		}, 300 + i * 120);
	});

	// Ripple effect on click
	buttons.forEach(btn => {
		btn.addEventListener('click', function(e) {
			const ripple = document.createElement('span');
			ripple.className = 'ripple';
			ripple.style.left = e.offsetX + 'px';
			ripple.style.top = e.offsetY + 'px';
			btn.appendChild(ripple);
			setTimeout(() => ripple.remove(), 600);
		});
	});
});
