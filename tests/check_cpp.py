"""Проверка сценариев меню. Перед запуском соберите build/autoservice."""
from pathlib import Path
import subprocess

binary = Path(__file__).resolve().parents[1] / "build" / "autoservice"


def run(commands):
    return subprocess.run(
        [str(binary)], input=commands, text=True, capture_output=True,
        check=True, timeout=5
    ).stdout


assert run("1\n0\n").count("| Автомобиль:") == 3
assert run("2\n0\n").count("| Имя:") == 2
assert "Toyota Corolla" in run("3\n1\n0\n")
assert "Анна Смирнова" in run("4\n2\n0\n")
assert "Toyota Corolla" in run("5\nCorolla\n0\n")
assert "Kia Rio" in run("5\nC789\n0\n")
assert "Иван Петров" in run("6\nПетров\n0\n")
assert "Анна Смирнова" in run("6\nAS002\n0\n")
assert "Запись не найдена" in run("3\n999\n0\n")
assert "Запись не найдена" in run("5\nUnknown\n0\n")
assert "положительным целым" in run("4\n2abc\n0\n")
assert "непустой запрос" in run("6\n   \n0\n")
assert "Неизвестный пункт" in run("9\n0\n")
assert "Пора пройти ТО" in run("3\n3\n0\n")
assert "500 км" in run("3\n1\n0\n")
run("3\n")  # Конец ввода во время запроса ID.
print("Все 16 проверок C++ пройдены.")
