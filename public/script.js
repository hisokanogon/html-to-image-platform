document.addEventListener('DOMContentLoaded', () => {
    const separateEditorContainer = document.getElementById('separate-editor-container');
    const combinedEditorContainer = document.getElementById('combined-editor-container');
    const pngOptions = document.getElementById('png-options');
    const jpegOptions = document.getElementById('jpeg-options');
    const jpegQualitySlider = document.getElementById('jpeg-quality');
    const jpegQualityValue = document.getElementById('jpeg-quality-value');
    const convertBtn = document.getElementById('convert-btn');
    const resultContainer = document.getElementById('result-container');
    const outputDiv = document.getElementById('output');
    const templateSelector = document.getElementById('template-selector');
    const separateModeRadio = document.getElementById('mode-separate');
    const livePreviewOutput = document.getElementById('live-preview-output');
    const outputWidthInput = document.getElementById('output-width');
    
    let lastGeneratedBlob = null;

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const updatePreview = async () => {
        resultContainer.classList.add('hidden');
        livePreviewOutput.innerHTML = `<div class="spinner"></div>`;
        const inputMode = document.querySelector('input[name="input-mode"]:checked').value;
        let html, css;
        if (inputMode === 'separate') {
            html = htmlEditor.getValue();
            css = cssEditor.getValue();
        } else {
            html = combinedEditor.getValue();
        }

        if (!html.trim() && !css.trim()) {
            livePreviewOutput.innerHTML = `<div class="placeholder">Your preview will appear here.</div>`;
            return;
        }

        const payload = {
            format: 'png',
            transparent: true,
            width: parseInt(outputWidthInput.value, 10) || 1200,
        };

        if (inputMode === 'separate') {
            payload.html = html;
            payload.css = css;
        } else {
            payload.combinedCode = html;
        }

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Conversion failed');
            
            const fileBlob = await response.blob();
            const fileUrl = URL.createObjectURL(fileBlob);
            livePreviewOutput.innerHTML = `<img src="${fileUrl}" alt="Live Preview">`;
        } catch (error) {
            console.error('Live Preview Error:', error);
            livePreviewOutput.innerHTML = `<p style="color: red; text-align: center;">Oops! Something went wrong.<br>Please check your code or try again.</p>`;
        }
    };

    const debouncedUpdatePreview = debounce(updatePreview, 500);

    const templates = [
        {
            name: 'Styled Button',
            html: `<a href="#" class="my-button">Click Me!</a>`,
            css: `body { display: flex; justify-content: center; align-items: center; height: 200px; margin: 0; }
.my-button { background: linear-gradient(45deg, #ff6b6b, #feca57); color: white; padding: 15px 30px; font-family: sans-serif; font-size: 20px; font-weight: bold; text-decoration: none; border-radius: 50px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); transition: transform 0.2s; }
.my-button:hover { transform: translateY(-3px); }`
        },
        {
            name: 'Code Snippet',
            html: `<pre><code>function greet(name) {\n  return \`Hello, \${name}!\`;\n}</code></pre>`,
            css: `pre { background-color: #282c34; color: #abb2bf; padding: 20px; border-radius: 8px; font-family: 'Fira Code', 'Courier New', monospace; font-size: 14px; line-height: 1.5; overflow: auto; }
code { font-family: inherit; }`
        },
        {
            name: 'Instagram Style Post',
            html: `<div class="post-card">
  <img src="https://picsum.photos/seed/picsum/600/600" alt="Sample photo">
  <div class="post-overlay">
    <div class="username">@Yorubox</div>
    <div class="caption">Creating beautiful things with code.</div>
  </div>
</div>`,
            css: `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
body { display: flex; justify-content: center; align-items: center; padding: 20px; }
.post-card { width: 400px; border-radius: 16px; box-shadow: 0 15px 30px rgba(0,0,0,0.2); overflow: hidden; position: relative; font-family: 'Roboto', sans-serif; }
.post-card img { width: 100%; display: block; }
.post-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; color: white; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
.username { font-weight: 700; font-size: 18px; margin-bottom: 5px; }
.caption { font-size: 14px; }`
        },
        {
            name: 'Professional Business Card',
            html: `<div class="business-card">
  <div class="logo-side">
    <span>HI</span>
  </div>
  <div class="info-side">
    <h3>Firstname Lastname</h3>
    <p>Web Developer</p>
    <ul>
      <li>name123@example.com</li>
      <li>(555) 123-4567</li>
      <li>example.com</li>
    </ul>
  </div>
</div>`,
            css: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Lato&display=swap');
body { display: flex; justify-content: center; align-items: center; height: 300px; }
.business-card { width: 450px; height: 250px; background: white; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; overflow: hidden; }
.logo-side { background-color: #34495e; color: white; flex-basis: 35%; display: flex; justify-content: center; align-items: center; font-family: 'Montserrat', sans-serif; font-size: 48px; }
.info-side { padding: 25px; flex-basis: 65%; font-family: 'Lato', sans-serif; }
.info-side h3 { font-family: 'Montserrat', sans-serif; margin: 0 0 5px 0; color: #2c3e50; }
.info-side p { margin: 0 0 20px 0; color: #7f8c8d; font-style: italic; }
.info-side ul { list-style: none; padding: 0; margin: 0; color: #34495e; }`
        },
        {
            name: 'Product Feature Card',
            html: `<div class="feature-card">
  <div class="feature-icon">🚀</div>
  <h4>Blazing Fast</h4>
  <p>Our platform leverages a high-performance rendering engine.</p>
</div>`,
            css: `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
body { display: flex; justify-content: center; align-items: center; padding: 20px; }
.feature-card { background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 30px; width: 280px; text-align: center; font-family: 'Poppins', sans-serif; box-shadow: 0 8px 16px rgba(0,0,0,0.05); }
.feature-icon { font-size: 40px; height: 80px; width: 80px; background: #e3f2fd; border-radius: 50%; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 20px; }
.feature-card h4 { margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: #333; }
.feature-card p { margin: 0; font-size: 15px; line-height: 1.6; color: #666; }`
        },
        {
            name: 'Inspirational Quote',
            html: `<figure class="quote-container">
  <blockquote>
    "It's not how much time you have, it's how you use it."
  </blockquote>
  <figcaption>— Ekko</figcaption>
</figure>`,
            css: `@import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@1,700&display=swap');
body { display: flex; justify-content: center; align-items: center; padding: 20px; }
.quote-container { background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(https://picsum.photos/seed/league/800/400); background-size: cover; background-position: center; color: white; padding: 50px; border-radius: 10px; width: 600px; text-align: center; font-family: 'Merriweather', serif; margin: 0; }
blockquote { font-size: 32px; font-style: italic; font-weight: 700; line-height: 1.4; border: none; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
figcaption { font-size: 18px; margin-top: 20px; opacity: 0.9; }`
        },
        {
            name: 'Notification Alerts',
            html: `<div class="alert alert-success">
  <span class="icon">✓</span> <span class="msg">Success! Your changes have been saved.</span>
</div>
<div class="alert alert-warning">
  <span class="icon">!</span> <span class="msg">Warning: Your session is about to expire.</span>
</div>
<div class="alert alert-error">
  <span class="icon">×</span> <span class="msg">Error: Could not connect to the server.</span>
</div>`,
            css: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500&display=swap');
body { display: flex; flex-direction: column; gap: 15px; padding: 20px; min-width: 450px; }
.alert { padding: 15px 20px; border-radius: 8px; font-family: 'Inter', sans-serif; font-weight: 500; display: flex; align-items: center; border: 1px solid transparent; }
.alert .icon { font-size: 20px; margin-right: 15px; font-weight: bold; }
.alert-success { background-color: #d4edda; border-color: #c3e6cb; color: #155724; }
.alert-warning { background-color: #fff3cd; border-color: #ffeeba; color: #856404; }
.alert-error { background-color: #f8d7da; border-color: #f5c6cb; color: #721c24; }`
        }
    ];

    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.name;
        option.textContent = template.name;
        templateSelector.appendChild(option);
    });

    const editorOptions = { lineNumbers: true, theme: 'dracula', autoCloseTags: true, lineWrapping: true };
    const htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-code'), { ...editorOptions, mode: 'xml' });
    const cssEditor = CodeMirror.fromTextArea(document.getElementById('css-code'), { ...editorOptions, mode: 'css' });
    const combinedEditor = CodeMirror.fromTextArea(document.getElementById('combined-code'), { ...editorOptions, mode: 'htmlmixed' });
    
    setTimeout(() => { combinedEditor.refresh(); }, 1);
    
    htmlEditor.on('change', debouncedUpdatePreview);
    cssEditor.on('change', debouncedUpdatePreview);
    combinedEditor.on('change', debouncedUpdatePreview);
    outputWidthInput.addEventListener('input', debouncedUpdatePreview);

    templateSelector.addEventListener('change', (e) => {
        resultContainer.classList.add('hidden');
        const selectedTemplate = templates.find(t => t.name === e.target.value);
        if (selectedTemplate) {
            separateModeRadio.checked = true;
            separateModeRadio.dispatchEvent(new Event('change'));
            htmlEditor.setValue(selectedTemplate.html);
            cssEditor.setValue(selectedTemplate.css);
            updatePreview();
        }
    });

    document.querySelectorAll('input[name="input-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            resultContainer.classList.add('hidden');
            const isSeparate = e.target.value === 'separate';
            separateEditorContainer.classList.toggle('hidden', !isSeparate);
            combinedEditorContainer.classList.toggle('hidden', isSeparate);
            if (isSeparate) { htmlEditor.refresh(); cssEditor.refresh(); } else { combinedEditor.refresh(); }
            if (e.isTrusted) templateSelector.value = "";
            debouncedUpdatePreview();
        });
    });

    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const format = document.querySelector('input[name="format"]:checked').value;
            pngOptions.classList.toggle('hidden', format !== 'png');
            jpegOptions.classList.toggle('hidden', format !== 'jpeg');
        });
    });
    
    jpegQualitySlider.addEventListener('input', (e) => {
        jpegQualityValue.textContent = e.target.value;
    });

    convertBtn.addEventListener('click', async () => {
        resultContainer.classList.remove('hidden');
        outputDiv.innerHTML = `<div class="spinner"></div>`;
        convertBtn.disabled = true;

        const format = document.querySelector('input[name="format"]:checked').value;
        const payload = {
            format: format,
            transparent: document.getElementById('transparent-bg').checked,
            width: parseInt(outputWidthInput.value, 10) || 1200,
            jpegQuality: parseInt(jpegQualitySlider.value, 10) || 90
        };

        const inputMode = document.querySelector('input[name="input-mode"]:checked').value;
        if (inputMode === 'separate') {
            payload.html = htmlEditor.getValue();
            payload.css = cssEditor.getValue();
        } else {
            payload.combinedCode = combinedEditor.getValue();
        }

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Conversion failed');

            outputDiv.innerHTML = '';
            lastGeneratedBlob = await response.blob();
            const fileUrl = URL.createObjectURL(lastGeneratedBlob);
            const fileName = `output.${format}`;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = fileUrl;
            downloadLink.download = fileName;
            downloadLink.textContent = `Download ${fileName.toUpperCase()}`;
            downloadLink.className = 'download-button';
            outputDiv.appendChild(downloadLink);
            
            if (format === 'png') {
                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy to Clipboard';
                copyButton.className = 'copy-button';
                copyButton.onclick = async () => {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': lastGeneratedBlob })
                        ]);
                        copyButton.textContent = 'Copied!';
                        setTimeout(() => copyButton.textContent = 'Copy to Clipboard', 2000);
                    } catch (err) {
                        copyButton.textContent = 'Copy Failed';
                    }
                };
                outputDiv.appendChild(copyButton);
            }

        } catch (error) {
            console.error('Final Generation Error:', error);
            outputDiv.innerHTML = `<p style="color: red;"><strong>Error:</strong> Something went wrong during the final conversion. Please check your code and try again.</p>`;
        } finally {
            convertBtn.disabled = false;
        }
    });
});