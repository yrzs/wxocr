import wcocr
import os
import uuid
import base64
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)
wcocr.init("./wx/opt/wechat/wxocr", "./wx/opt/wechat")


@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        # Get base64 image from request
        image_data = request.json.get("image")
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        # Extract image type from base64 data
        image_type, base64_data = extract_image_type(image_data)
        if not image_type:
            return jsonify({"error": "Invalid base64 image data"}), 400

        # Create temp directory if not exists
        temp_dir = "temp"
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)

        # Generate unique filename and save image
        filename = os.path.join(temp_dir, f"{str(uuid.uuid4())}.{image_type}")
        try:
            image_bytes = base64.b64decode(base64_data)
            with open(filename, "wb") as f:
                f.write(image_bytes)

            # Process image with OCR
            result = wcocr.ocr(filename)
            return jsonify({"result": result})

        finally:
            # Clean up temp file
            if os.path.exists(filename):
                os.remove(filename)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 创建静态文件夹
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)


def extract_image_type(base64_data):
    # Check if the base64 data has the expected prefix
    if base64_data.startswith("data:image/"):
        # Extract the image type from the prefix
        prefix_end = base64_data.find(";base64,")
        if prefix_end != -1:
            return (
                base64_data[len("data:image/") : prefix_end],
                base64_data.split(";base64,")[-1],
            )
    return "png", base64_data


@app.route("/")
def index():
    return render_template("index.html")


def recognize_text(image_path):
    """
    识别图像中的文字并返回结果
    
    Args:
        image_path: 图像文件路径
        
    Returns:
        识别出的文字内容和区域信息
    """
    try:
        # 调用现有的OCR功能
        result = wcocr.ocr(image_path)
        # 直接返回完整的结果对象，而不是只返回文本
        return result
    except Exception as e:
        print(f"OCR识别错误: {str(e)}")
        return {"errcode": -1, "error": str(e)}


if __name__ == "__main__":
    # 确保templates目录存在
    templates_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "templates"
    )
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)

    # 确保temp目录存在
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    app.run(host="0.0.0.0", port=5000, threaded=True)
