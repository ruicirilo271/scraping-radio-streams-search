from flask import Flask, render_template
from pyradios import RadioBrowser

app = Flask(__name__)
rb = RadioBrowser()

@app.route("/")
def index():
    try:
        # Renderiza a página inicial sem limitar as rádios
        return render_template("index.html")

    except Exception as e:
        return f"Erro ao carregar rádios: {e}"

if __name__ == "__main__":
    app.run(debug=True)
