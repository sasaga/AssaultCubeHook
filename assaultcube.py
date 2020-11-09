import curses
import codecs
import frida
from pynput import mouse
import struct 
from tabulate import tabulate

class AssaultCube:
    def __init__(self):
        self.session = frida.attach('assaultcube')

        with codecs.open('./src/assaultcubeHooking.js', 'r', 'utf-8') as file:
            self.source = file.read()

        self.script = self.session.create_script(self.source)
        self.script.load()

        self.rpc = self.script.exports

#------------------------------------------------------------------------ Clases
class Menu(object) :

    def __init__(self, prompt="assaultcube@hook>") :
        self.prompt = prompt + " "
        self.opciones = [
            self.search_memory,
            self.write_memory,
            self.monitor_health,
            self.monitor_shot,
            self.health,
            self.machine_gun,
            self.machine_gun_charger,
            self.gun,
            self.gun_charger,
            self.sniper,
            self.sniper_charger,
            self.armor,
            self.grenade,
            self.killing_interceptor,
            self.set_aimbot,
            self.get_player_shot,
        ]
        self.presentacion = "------------------ MENU ASSAULTCUBE ------------------\n"

        for numero, opcion in enumerate(self.opciones, 1) :
            self.presentacion += "{0}. {1}\n".format(numero, opcion.__name__[:])

        self.myObject = AssaultCube();

    def loop(self):
        while True:
            print(self.presentacion)
            try:
                self.seleccion = int(input(self.prompt))

                if self.seleccion == 1:
                    self.search_memory()
                if self.seleccion == 2:
                    self.write_memory()
                if self.seleccion == 3:
                    self.monitor_health()
                if self.seleccion == 4:
                    self.monitor_shot()
                if self.seleccion == 5:
                    self.health()
                if self.seleccion == 6:
                    self.machine_gun()
                if self.seleccion == 7:
                    self.machine_gun_charger()
                if self.seleccion == 8:
                    self.gun()
                if self.seleccion == 9:
                    self.gun_charger()
                if self.seleccion == 10:
                    self.sniper()
                if self.seleccion == 11:
                    self.sniper_charger()
                if self.seleccion == 12:
                    self.armor()
                if self.seleccion == 13:
                    self.grenade()
                if self.seleccion == 14:
                    self.killing_interceptor()
                if self.seleccion == 15:
                    curses.wrapper(self.set_aimbot)
                if self.seleccion == 16:
                    self.get_player_shot()
            except ValueError:
                input("debe ingresar un numero :(")
            except KeyboardInterrupt:
                break

    def type_format(self, mem_type, value):
        self.mem_types = {
            'u32': ('<I', 4), # unsigned int (4 bytes)
            's32': ('<i', 4), # signed int (4 bytes)
            'u64': ('<Q', 8), # unsigned long (8 bytes)
            's64': ('<q', 8), # signed long (8 bytes)
            'f'  : ('<f', 4), # float (4 bytes)
            'd'  : ('<d', 8)  # double (8 byte)
        }

        if mem_type == 's':
            self.s = value.encode().hex()
        else:
            self.s = struct.pack(self.mem_types[mem_type][0], value)
            self.s = codecs.encode(self.s, 'hex').decode()

        self.s = iter(self.s)
        return ' '.join(i + j for i, j in zip(self.s, self.s))

    def search_memory(self):
        self.types_value = {'u32':['unsigned int (4 bytes)'], 's32':['signed int (4 bytes)'], 'u64':['unsigned long (8 bytes)'], 's64':['signed long (8 bytes)'], 'f':['float (4 bytes)'], 'd':['double (8 bytes)']}
        self.value = int(input("input value to search in memory: "))
        print(tabulate(self.types_value, headers="keys"))
        self.types_value = str(input(": "))
        self.value = self.type_format(self.types_value, self.value)
        self.result = self.myObject.rpc.search_memory(self.value)

        if len(self.result) > 0 :
            print("[+] "+ str(len(self.result))+" results")
            self.value = int(input("input new value to search in memory: "))
            self.value = self.type_format(self.types_value, self.value)
            self.result = self.myObject.rpc.search_memory(self.value, self.result)

            if len(self.result) > 0:
                for data in self.result:
                    print("[+] address => "+data['address'])
            else:
                print("[-] not result found to criteria....")
        else:
            print("[-] not result found to criteria....")

    def write_memory(self):
        self.types_value = {'u32':['unsigned int (4 bytes)'], 's32':['signed int (4 bytes)'], 'u64':['unsigned long (8 bytes)'], 's64':['signed long (8 bytes)'], 'f':['float (4 bytes)'], 'd':['double (8 bytes)']}
        self.value = int(input("input value to write in memory: "))
        self.pointerMemory = input("input pointer memory address: ")
        print(tabulate(self.types_value, headers="keys"))
        self.types_value = str(input(": "))
        self.value = self.type_format(self.types_value, self.value)
        self.value = list(map(lambda x: int(x, 16), self.value.split()))
        try:
            self.result = self.myObject.rpc.write_memory(self.pointerMemory, self.value)
            print("[+] The value was spelled correctly.")
        except:
            print("[-] There was an error while the process was running.")

    def monitor_health(self):
        try:
            print("[+] enable to monitor health....")
            self.myObject.rpc.monitor_health()
        except KeyboardInterrupt:
            self.myObject.rpc.killing_interceptor()

    def monitor_shot(self):
        try:
            print("[+] enable to monitor shot....")
            self.myObject.rpc.monitor_shot()
        except KeyboardInterrupt:
            self.myObject.rpc.killing_interceptor()

    def health(self):
        self.health = int(input("Enter the new value for health: "))
        self.health = self.type_format('u32', self.health)
        self.health =  list(map(lambda x: int(x, 16), self.health.split()))
        self.myObject.rpc.health(self.health)

    def machine_gun(self):
        self.bullet = int(input("Enter the new value for bullet: "))
        self.bullet = self.type_format('u32', self.bullet)
        self.bullet =  list(map(lambda x: int(x, 16), self.bullet.split()))
        self.myObject.rpc.machine_gun(self.bullet)

    def machine_gun_charger(self):
        self.charger = int(input("Enter the new value for charger: "))
        self.charger = self.type_format('u32', self.charger)
        self.charger =  list(map(lambda x: int(x, 16), self.charger.split()))
        self.myObject.rpc.machine_gun_charger(self.charger)

    def gun(self):
        self.bullet = int(input("Enter the new value for bullet: "))
        self.bullet = self.type_format('u32', self.bullet)
        self.bullet =  list(map(lambda x: int(x, 16), self.bullet.split()))
        self.myObject.rpc.gun(self.bullet)

    def gun_charger(self):
        self.charger = int(input("Enter the new value for charger: "))
        self.charger = self.type_format('u32', self.charger)
        self.charger =  list(map(lambda x: int(x, 16), self.charger.split()))
        self.myObject.rpc.gun_charger(self.charger)

    def sniper(self):
        self.bullet = int(input("Enter the new value for bullet: "))
        self.bullet = self.type_format('u32', self.bullet)
        self.bullet =  list(map(lambda x: int(x, 16), self.bullet.split()))
        self.myObject.rpc.sniper(self.bullet)

    def sniper_charger(self):
        self.charger = int(input("Enter the new value for charger: "))
        self.charger = self.type_format('u32', self.charger)
        self.charger =  list(map(lambda x: int(x, 16), self.charger.split()))
        self.myObject.rpc.sniper_charger(self.charger)

    def armor(self):
        self.armor = int(input("Enter the new value for armor: "))
        self.armor = self.type_format('u32', self.armor)
        self.armor =  list(map(lambda x: int(x, 16), self.armor.split()))
        self.myObject.rpc.armor(self.armor)

    def grenade(self):
        self.grenade = int(input("Enter the new value for grenade: "))
        self.grenade = self.type_format('u32', self.grenade)
        self.grenade =  list(map(lambda x: int(x, 16), self.grenade.split()))
        self.myObject.rpc.grenade(self.grenade)

    def killing_interceptor(self):
         self.myObject.rpc.killing_interceptor()

    def set_aimbot(self, stdscr):
        try:
            # The event listener will be running in this block
            with mouse.Events() as events:
                for event in events:
                    try:
                        if event.button == mouse.Button.right:
                            stdscr.clear()
                            stdscr.addstr(str(self.myObject.rpc.set_aimbot()))
                            stdscr.refresh()
                    except:
                        pass
        except KeyboardInterrupt:
            return 

    def get_player_shot(self):
        print("[+] enable to get player shotting....")
        self.myObject.rpc.get_player_shot()        

mi_menu = Menu()
mi_menu.loop()