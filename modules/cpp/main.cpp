#include <array>
#include <iostream>
#include <sstream>
#include <string>

struct Car {
    int id;
    std::string name;
    std::string plate;
    int mileage;
    int nextService;
    int ownerId;
};

struct User {
    int id;
    std::string name;
    std::string personnelNumber;
};

const std::array<Car, 3> cars = {{
    {1, "Toyota Corolla", "A123AA", 59500, 60000, 1},
    {2, "Lada Vesta", "B456BB", 32000, 40000, 2},
    {3, "Kia Rio", "C789CC", 75000, 75000, 1}
}};

const std::array<User, 2> users = {{
    {1, "Иван Петров", "AS001"},
    {2, "Анна Смирнова", "AS002"}
}};

void printCar(const Car& car) {
    std::cout << "ID: " << car.id << " | Автомобиль: " << car.name
              << " | Номер: " << car.plate
              << " | Пробег: " << car.mileage
              << " | Следующее ТО: " << car.nextService
              << " | ID владельца: " << car.ownerId << '\n';
    if (car.mileage >= car.nextService) {
        std::cout << "Пора пройти ТО.\n";
    } else {
        std::cout << "До ТО осталось " << car.nextService - car.mileage << " км.\n";
    }
}

void printUser(const User& user) {
    std::cout << "ID: " << user.id << " | Имя: " << user.name
              << " | Табельный номер: " << user.personnelNumber << '\n';
}

bool readLine(const std::string& prompt, std::string& value) {
    std::cout << prompt;
    return static_cast<bool>(std::getline(std::cin, value));
}

int parseId(const std::string& text) {
    std::istringstream input(text);
    int id;
    if (!(input >> id) || id <= 0) {
        return -1;
    }
    input >> std::ws;
    return input.eof() ? id : -1;
}

int main() {
    std::cout << "AutoService — учебный модуль C++\n";
    std::string command;
    while (readLine(
        "\n1 — Все автомобили\n2 — Все пользователи\n"
        "3 — Выбрать автомобиль по ID\n4 — Выбрать пользователя по ID\n"
        "5 — Поиск автомобиля по названию или номеру\n"
        "6 — Поиск пользователя по имени или табельному номеру\n"
        "0 — Выход\nВаш выбор: ", command)) {
        if (command == "0") {
            break;
        }
        if (command == "1") {
            for (const Car& car : cars) {
                printCar(car);
            }
            continue;
        }
        if (command == "2") {
            for (const User& user : users) {
                printUser(user);
            }
            continue;
        }
        if (command != "3" && command != "4" && command != "5" && command != "6") {
            std::cout << "Неизвестный пункт меню.\n";
            continue;
        }

        std::string query;
        if (!readLine("Введите ID или строку поиска: ", query)) {
            break;
        }
        if (query.find_first_not_of(" \t\r") == std::string::npos) {
            std::cout << "Введите непустой запрос.\n";
            continue;
        }
        const int id = parseId(query);
        if ((command == "3" || command == "4") && id == -1) {
            std::cout << "ID должен быть положительным целым числом.\n";
            continue;
        }

        bool found = false;
        if (command == "3" || command == "5") {
            for (const Car& car : cars) {
                const bool matches = command == "3"
                    ? car.id == id
                    : car.name.find(query) != std::string::npos ||
                      car.plate.find(query) != std::string::npos;
                if (matches) {
                    printCar(car);
                    found = true;
                }
            }
        } else {
            for (const User& user : users) {
                const bool matches = command == "4"
                    ? user.id == id
                    : user.name.find(query) != std::string::npos ||
                      user.personnelNumber.find(query) != std::string::npos;
                if (matches) {
                    printUser(user);
                    found = true;
                }
            }
        }
        if (!found) {
            std::cout << "Запись не найдена.\n";
        }
    }
    return 0;
}
