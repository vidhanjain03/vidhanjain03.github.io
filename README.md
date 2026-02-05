# 🚀 Vidhan Jain - Personal Portfolio Website

A modern, responsive personal portfolio website featuring cutting-edge **Glassmorphism UI** design inspired by 2026 trends. Built with pure HTML, CSS, and JavaScript - no dependencies required!

## ✨ Features

### 🎨 Design & UI/UX
- **Liquid Glass Aesthetic** - Frosted glass panels with blur effects
- **Animated Background** - Floating gradient orbs with smooth animations
- **Dark/Light Mode** - Toggle between themes with persistent storage
- **Smooth Animations** - Fade-in effects, parallax scrolling, and micro-interactions
- **Fully Responsive** - Mobile-first design that works on all devices
- **Modern Typography** - Custom Google Fonts (Unbounded + Space Mono)
- **Interactive Elements** - Hover effects, smooth scrolling, and cursor trails

### 📱 Responsive Breakpoints
- Desktop: 1400px+ (full experience)
- Tablet: 768px - 1399px (optimized layout)
- Mobile: < 768px (mobile-first)

### 🎯 Sections Included
1. **Hero Section** - Eye-catching introduction with gradient text and CTA buttons
2. **Education** - Academic background with timeline cards
3. **Experience** - Professional experience at ISRO
4. **Research & Publications** - Academic publications with detailed descriptions
5. **Projects** - Featured projects with tech stacks and GitHub links
6. **Skills** - Technical skills organized by category
7. **Contact** - Multiple ways to get in touch

## 🛠️ Technologies Used

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, animations, glassmorphism effects
- **JavaScript (Vanilla)** - No frameworks, pure JS for interactions

### Design Elements
- **Glassmorphism** - Frosted glass UI with backdrop-filter
- **Gradient Meshes** - Multi-color animated backgrounds
- **Custom Animations** - Keyframe animations and transitions
- **Intersection Observer API** - Scroll-triggered animations

## 📦 Installation & Setup

### Option 1: Direct Use (Recommended)
Simply open `portfolio.html` in any modern web browser. That's it! No build process needed.

```bash
# Open in browser (any of these commands)
open portfolio.html           # macOS
xdg-open portfolio.html       # Linux
start portfolio.html          # Windows
```

### Option 2: Local Development Server
For better development experience:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (install http-server globally)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000/portfolio.html`

## 🎨 Customization Guide

### 1. Update Personal Information

**Edit the HTML content in these sections:**

```html
<!-- Hero Section -->
<h1>Your Name</h1>
<p class="tagline">Your Title</p>

<!-- Contact Info -->
<a href="mailto:your-email@example.com">your-email@example.com</a>
```

### 2. Change Color Scheme

**Modify CSS variables in the `:root` section:**

```css
:root {
    --primary-gradient: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
    --secondary-gradient: linear-gradient(135deg, #YOUR_COLOR3 0%, #YOUR_COLOR4 100%);
    /* ... more colors ... */
}
```

**Popular color schemes:**
- Purple/Pink: `#667eea`, `#764ba2`, `#f093fb`, `#f5576c`
- Blue/Cyan: `#4facfe`, `#00f2fe`, `#43e97b`, `#38f9d7`
- Orange/Red: `#fa709a`, `#fee140`, `#ff6b6b`, `#feca57`

### 3. Add/Remove Sections

**To add a new section:**

```html
<section id="new-section" class="fade-in-section">
    <div class="container">
        <h2 class="section-title">New Section</h2>
        <!-- Your content -->
    </div>
</section>
```

**Update navigation:**

```html
<nav class="glass">
    <ul>
        <li><a href="#new-section">New Section</a></li>
    </ul>
</nav>
```

### 4. Modify Fonts

**Replace Google Fonts in the `<head>`:**

```html
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap" rel="stylesheet">
```

**Update CSS:**

```css
h1, h2, h3 {
    font-family: 'YOUR_DISPLAY_FONT', sans-serif;
}

body {
    font-family: 'YOUR_BODY_FONT', sans-serif;
}
```

## 🚀 Deployment Options

### GitHub Pages (Free)
1. Create a repository on GitHub
2. Upload `portfolio.html`
3. Go to Settings → Pages
4. Select branch and folder
5. Your site will be live at: `https://yourusername.github.io/repo-name/`

### Netlify (Free)
1. Drag and drop the HTML file to [netlify.com/drop](https://netlify.com/drop)
2. Instant deployment!
3. Get a free subdomain: `yoursite.netlify.app`

### Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in your project directory
3. Follow prompts
4. Done!

### Custom Domain
All platforms above support custom domains. Simply:
1. Purchase a domain (Namecheap, GoDaddy, etc.)
2. Add DNS records in your hosting platform
3. Wait for propagation (5-30 minutes)

## 🔧 Advanced Customization

### Adding Backend Functionality

**Contact Form with EmailJS:**

```javascript
// Add EmailJS script to <head>
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>

// Add form handling
emailjs.init("YOUR_PUBLIC_KEY");

function sendEmail(e) {
    e.preventDefault();
    emailjs.sendForm('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', e.target)
        .then(() => alert('Message sent!'))
        .catch(() => alert('Error sending message'));
}
```

### Analytics Integration

**Google Analytics:**

```html
<!-- Add before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
</script>
```

### SEO Optimization

**Add meta tags:**

```html
<head>
    <meta name="description" content="Your portfolio description">
    <meta name="keywords" content="AI, ML, Computer Vision, Research">
    <meta name="author" content="Your Name">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Your Name - Portfolio">
    <meta property="og:description" content="Your description">
    <meta property="og:image" content="your-image-url.jpg">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
</head>
```

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Opera 76+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** Glassmorphism requires `backdrop-filter` support. Works on all modern browsers.

## 🎓 Learning Resources

**Glassmorphism:**
- [CSS Tricks - Glassmorphism](https://css-tricks.com/glassmorphism/)
- [Glassmorphism Generator](https://hype4.academy/tools/glassmorphism-generator)

**Animations:**
- [MDN - CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

## 🐛 Troubleshooting

**Issue: Blur effect not showing**
- Check browser support for `backdrop-filter`
- Ensure GPU acceleration is enabled
- Try increasing blur value: `backdrop-filter: blur(30px);`

**Issue: Animations not working**
- Check JavaScript console for errors
- Ensure Intersection Observer API is supported
- Try disabling browser extensions

**Issue: Fonts not loading**
- Check Google Fonts link in `<head>`
- Verify internet connection
- Clear browser cache

## 📄 License

This template is free to use for personal portfolios. Feel free to modify and customize!

## 🤝 Contributing

Found a bug or have a suggestion? Feel free to:
1. Fork the repository
2. Make your changes
3. Submit a pull request

## 📧 Contact & Support

If you need help customizing your portfolio:
- Email: vidhanjain2019@gmail.com
- GitHub: [@vidhanjain03](https://github.com/vidhanjain03)

---

**Built with 💜 by Vidhan Jain**

*Inspired by 2026 design trends: Glassmorphism, Liquid Design, and Modern Web Aesthetics*
