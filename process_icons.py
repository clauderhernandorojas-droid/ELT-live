import os
from PIL import Image

# Ruta a la imagen que acabas de generar
MASTER_IMAGE = "master_icon.png"
# Carpeta donde se guardará el .ico
OUTPUT_DIR = "assets"
# Nombre del archivo .ico final
ICON_NAME = "icon.ico"

def create_professional_icon():
    if not os.path.exists(MASTER_IMAGE):
        print(f"Error: No se encontró la imagen maestro '{MASTER_IMAGE}'.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, ICON_NAME)

    try:
        # Abrimos la imagen maestro
        img = Image.open(MASTER_IMAGE)
        
        # Extraemos el icono principal (el grande de 256x256)
        # Basado en la composición, el icono grande está aproximadamente en la mitad izquierda.
        # Vamos a asumir que el icono grande es el cuadrado central de la imagen maestro.
        # Según el diseño, es un cuadrado centrado en el área izquierda. 
        # Una estimación precisa del área del icono grande (excluyendo texto y rejilla):
        # Supondremos que el icono grande ocupa la mitad izquierda de la imagen.
        width, height = img.size
        left_area = img.crop((0, 0, width // 2, height))
        
        # Redimensionamos ese recorte para obtener el tamaño base de 256x256
        # (Si la imagen original ya tiene 256x256 de resolución de icono, esto solo lo prepara para el .ico)
        large_icon = left_area.resize((256, 256), Image.Resampling.LANCZOS)

        # Lista de tamaños requeridos para un .ico de Windows de alta calidad
        icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
        
        # Guardamos como .ico
        large_icon.save(output_path, format='ICO', sizes=icon_sizes)
        print(f"¡Éxito! Archivo .ico profesional generado en: {output_path}")
        print("Ahora solo configura el package.json y recompila los .exe.")

    except Exception as e:
        print(f"Error al procesar la imagen: {e}")
        print("Asegúrate de tener Pillow instalado: pip install Pillow")

if __name__ == "__main__":
    create_professional_icon()