# ASCIIFY_image-to-ascii

An image to ASCII art generator with animated text effects and export functionality.

## Live Demo | [ASCIIFY](https://asciify-z72q.onrender.com/)

## 🌿 How It Works

Asciify processes uploaded images and converts their visual information into text-based artwork.

## 🌿 Features

- Image Upload
- Monochrome Mode
- Original Colour Mode
- Animated ASCII Art
- Animation Controls
- PNG Export
- GIF Export
  
<img width="1912" height="967" alt="asciify-1" src="https://github.com/user-attachments/assets/49b50554-829c-4124-9db4-9314068315cd" />


## 🌿How to Use

1. Upload an image by clicking Choose File or dragging and dropping.
2. Choose the desired text.
3. Choose a colour mode.
4. Generate.
5. Play and pause your animation.
6. Export as GIF or PNG.

<img width="1917" height="970" alt="asciify-3" src="https://github.com/user-attachments/assets/ea12ff4e-5514-48f3-8c38-3c556948b723" />

## Exported Gif
<img width="1200" height="750" alt="Spiderman" src="https://github.com/user-attachments/assets/b810de0f-6f17-4334-8dcc-ddf87b021356" />


## 🌿 Technologies Used

- Python
- Flask
- Pillow
- ImageIO
- HTML
- CSS
- JavaScript

## How to run

```bash
# 1. create virtual environment
python -m venv .venv
venv\Scripts\activate
```


```bash
# 2. install dependencies
pip install -r requirements.txt
```


```bash
# 3. run application
python ascii.py
```

## Notes

- Application must be running locally.
- Large images may take some time.
- Generated PNGs/GIFs are stored in the `generated` file.
