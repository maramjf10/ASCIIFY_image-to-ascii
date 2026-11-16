from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageDraw, ImageFont
import os
import uuid
import io
import imageio.v2 as imageio

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/generated"
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded."}), 400
    file = request.files["image"]
    phrase = request.form.get("phrase", "ASCII ")
    color_mode = request.form.get("color_mode", "monochrome")

    if not file.filename:
        return jsonify({"error": "Please select an image."}), 400

    if not phrase.strip():
        phrase = "ASCII "

    if color_mode not in ["monochrome", "color"]:
        color_mode = "monochrome"

    try:
        image = Image.open(file.stream).convert("RGB")
        output_width = 1200
        output_height = 750
        image.thumbnail((output_width, output_height))
        output = Image.new(
            "RGB",
            (output_width, output_height),
            (0, 0, 0)
        )

        draw = ImageDraw.Draw(output)

        try:
            font = ImageFont.truetype("DejaVuSansMono.ttf", 12)
        except OSError:
            font = ImageFont.load_default()
        char_width = max(1, int(font.getlength("M") * 0.85))
        bbox = font.getbbox("M")
        char_height = max(1, bbox[3] - bbox[1] + 2)
        columns = output_width // char_width
        rows = output_height // char_height
        resized = image.resize(
            (columns, rows),
            Image.Resampling.LANCZOS
        )

        grayscale = resized.convert("L")
        phrase = phrase.strip() + " "
        character_rows = []
        character_colors = []
        character_brightness = []

        for row in range(rows):

            current_row = ""
            for column in range(columns):
                pixel = resized.getpixel((column, row))
                brightness = grayscale.getpixel((column, row))

                if brightness < 12:
                    character = " "
                    text_color = (0, 0, 0)

                else:
                    character = phrase[
                        (column + row * 3) % len(phrase)
                    ]

                    if color_mode == "color":
                        text_color = pixel
                    else:
                        text_color = (
                            brightness,
                            brightness,
                            brightness
                        )

                    draw.text(
                        (
                            column * char_width,
                            row * char_height - bbox[1]
                        ),
                        character,
                        fill=text_color,
                        font=font
                    )

                current_row += character
                character_colors.extend(text_color)
                character_brightness.append(brightness)
            character_rows.append(current_row)

        filename = f"{uuid.uuid4().hex}.png"
        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        output.save(filepath)
        return jsonify({
            "success": True,
            "image_url": "/" + filepath.replace("\\", "/"),
            "animation_data": {
                "width": output_width,
                "height": output_height,
                "columns": columns,
                "rows": rows,
                "char_width": char_width,
                "char_height": char_height,
                "font_size": 12,
                "characters": character_rows,
                "colors": character_colors,
                "brightness": character_brightness,
                "color_mode": color_mode,
                "phrase": phrase
            }
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500

@app.route("/export-gif", methods=["POST"])
def export_gif():

    frames = request.files.getlist("frames")
    if not frames:
        return jsonify({"error": "No animation frames received."}), 400

    try:

        gif_frames = []
        for frame in frames:
            image = imageio.imread(io.BytesIO(frame.read()))
            gif_frames.append(image)
        filename = f"{uuid.uuid4().hex}.gif"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        imageio.mimsave(
            filepath,
            gif_frames,
            format="GIF",
            duration=0.12,
            loop=0
        )

        return jsonify({
            "success": True,
            "gif_url": "/" + filepath.replace("\\", "/")
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500
@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "error": "File is too large. Maximum size is 200MB."
    }), 413

if __name__ == "__main__":
    app.run(debug=True)
