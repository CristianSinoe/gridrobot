Tu interfaz Wi-Fi es:

```bash
wlp2s0
```

Pero ahorita está conectada a la red:

```text
RIUV
```

Entonces hay dos escenarios:

## Opción A: usar esa misma tarjeta para crear hotspot

Esto normalmente **te va a desconectar de RIUV**, porque la misma tarjeta pasaría de modo cliente a modo punto de acceso.

Ejecuta:

```bash
sudo nmcli device wifi hotspot ifname wlp2s0 ssid GRIDBOT password "gridbot123"
```

Luego revisa:

```bash
nmcli connection show --active
```

Y revisa tu IP:

```bash
ip addr show wlp2s0
```

Busca algo como:

```text
10.42.0.1
```

Desde otro dispositivo conectado al Wi-Fi `GRIDBOT`, entrarías a:

```text
http://10.42.0.1:5173
```

O para tu vista:

```text
http://10.42.0.1:5173/admin/game-view
```

---

## Opción B: mantener internet y compartirlo

Si solo tienes **una tarjeta Wi-Fi**, es probable que no puedas estar conectado a `RIUV` y crear hotspot estable al mismo tiempo.

Para tener internet y hotspot a la vez, lo más recomendable es:

1. Que tu Debian tenga internet por cable Ethernet, o
2. Compartir internet desde tu celular por USB tethering, o
3. Usar un adaptador Wi-Fi USB extra.

Entonces la laptop recibiría internet por otro medio y `wlp2s0` se usaría para crear el hotspot.

---

## Para apagar el hotspot

```bash
sudo nmcli connection down Hotspot
```

Si no funciona por el nombre, revisa conexiones:

```bash
nmcli connection show
```

Y baja la conexión que corresponda.

---

## Para tu proyecto GRIDBOT

Cuando ya esté el hotspot activo, levanta el frontend así:

```bash
npm run dev -- --host 0.0.0.0
```

Y si usas backend en Docker/Node, asegúrate de que esté expuesto en:

```text
0.0.0.0:4000
```

Con eso otros dispositivos conectados al hotspot podrán entrar a tu app desde la IP de Debian.
