import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync: {},
});

const options = {
  host: 'broker.emqx.io',
  port: 8083,
  path: '/esp32',
  id: 'id_' + parseInt(Math.random() * 100000),
};

const client = new Paho.MQTT.Client(options.host, options.port, options.path);

const App: React.FC = () => {
  const [temperature, setTemperature] = useState<number>(19);
  const [connected, setConnected] = useState<boolean>(false);
  const [publishing, setPublishing] = useState(false);
  const [messageList, setMessageList] = useState<string[]>([]);
  const [temperatureList, setTemperatureList] = useState<string[]>([]);
  const [luminosityList, setLuminosityList] = useState<string[]>([]);
  const [lastButtonMessage, setLastButtonMessage] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);

  const fillPercentage = Math.max(0, Math.min(100, (temperature / 40) * 100));
  let barColor = '#FF0000'; // Cor padrão para temperaturas altas
  let bulbColor = '#FF0000'; // Cor padrão para temperaturas altas

  if (temperature < 20) {
    barColor = '#0095ff'; // Cor verde para temperaturas baixas
    bulbColor = '#0095ff'; // Cor verde para temperaturas baixas
  } else if (temperature < 30) {
    barColor = '#ff9100'; // Cor amarela para temperaturas médias
    bulbColor = '#ff9100'; // Cor amarela para temperaturas médias
  }

  const mercuryHeight = (200 * fillPercentage) / 100;

  useEffect(() => {
    const onConnectionLost = (responseObject: any) => {
      if (responseObject.errorCode !== 0) {
        console.log('Connection lost:', responseObject.errorMessage);
      }
      setConnected(false);
      setConnecting(false);
    };

    const onMessageArrived = (message: any) => {
      console.log('Message arrived:', message.payloadString);
      const topic = message.destinationName;
      const payload = message.payloadString;

      setMessageList(prevList => [...prevList, payload]);

      if (topic === '/temperatura') {
        setTemperatureList(prevList => [...prevList, payload]);
        try {
          setTemperature(parseFloat(payload));
        } catch (error) {
          console.log(error);
        }
        console.log(temperatureList.length);
      } else if (topic === '/luminosidade') {
        setLuminosityList(prevList => [...prevList, payload]);
        console.log(luminosityList.length);
      } else if (topic === '/botao') {
        setLastButtonMessage(payload);
      }
    };

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
  }, [client]);

  const connectToMqttServer = () => {
    setConnecting(true);
    client.connect({
      onSuccess: () => {
        client.subscribe('/temperatura');
        client.subscribe('/luminosidade');
        client.subscribe('/botao');
        setConnected(true);
        setConnecting(false);
        ToastAndroid.show('Conectado ao servidor MQTT', ToastAndroid.SHORT);
      },
      useSSL: false,
      timeout: 3,
      onFailure: (erro: any) => {
        console.log('Connection failed:', erro);
        alert('Não foi possível conectar ao servidor MQTT');
        setConnected(false);
        setConnecting(false);
      },
    });
  };

  const publishMessage = () => {
    if (!publishing) {
      const message = new Paho.MQTT.Message(
        lastButtonMessage === '0' ? '1' : '0',
      );
      message.destinationName = '/botao';
      client.send(message);
      console.log('Message sent:', message.payloadString);
      setPublishing(true);
      setTimeout(() => {
        setPublishing(false);
      }, 2000);
    }
  };

  return (
    <>
      <View style={styles.container2}>
        <View style={{flexDirection: 'row'}}>
          <View style={styles.glass}>
            <View
              style={[
                styles.mercury,
                {height: mercuryHeight, backgroundColor: barColor},
              ]}
            />
            <View style={[styles.bulb, {backgroundColor: bulbColor}]}>
              <Text style={styles.temperatureText}>
                {temperatureList[temperatureList.length - 1]}°C
              </Text>
            </View>
          </View>
          <View style={[styles.bulb2]}>
            <TouchableOpacity style={styles.bocal}>
              <View style={styles.stripe} />
              <View style={styles.stripe} />
              <View style={styles.stripe} />
            </TouchableOpacity>
            <View style={styles.upperBulb} />
            <View style={styles.lowerBulb}>
              <Text style={{fontSize: 33}}>{`${
                luminosityList[luminosityList.length - 1]
              }%`}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.container}>
        <Button
          title={
            connecting
              ? 'Conectando...'
              : connected
              ? 'Desconectar'
              : 'Conectar'
          }
          disabled={connecting ? true : false}
          onPress={connected ? () => client.disconnect() : connectToMqttServer}
        />
        <Button
          title={
            publishing
              ? 'executando...'
              : `${lastButtonMessage === '0' ? 'Ligar' : 'Desligar'}`
          }
          onPress={publishMessage}
          disabled={!connected || publishing}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 2,
    paddingTop: 70,
    paddingHorizontal: 16,
  },
  messageBox: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  messageComponent: {
    marginBottom: 5,
    backgroundColor: '#0075e2',
    padding: 5,
    borderRadius: 3,
  },
  textMessage: {
    color: 'white',
    fontSize: 16,
  },
  container2: {
    flex: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  glass: {
    width: 30,
    height: 200,
    borderRadius: 15,
    backgroundColor: '#a4a4a4',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mercury: {
    position: 'absolute',
    bottom: 30,
    left: '35%',
    width: 10,
  },
  bulb: {
    position: 'absolute',
    bottom: 0,
    left: '1%',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  temperatureText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bulb3: {
    width: 100,
    height: 150,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFF00',
    // width: 100,
    // left: '100%',
    // height: 150,
    // borderRadius: 50,
    // justifyContent: 'flex-start',
    // alignItems: 'center',
    // alignSelf: 'center',
  },
  bocal: {
    borderWidth: 1,
    borderColor: '#000000',
    width: 50,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stripe: {
    width: 48,
    height: 3,
    backgroundColor: 'black',
  },
  bulb2: {
    left: '100%',
    width: 80,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // Cor de fundo da lâmpada
  },
  upperBulb: {
    width: 45,
    height: 30,
    backgroundColor: '#FFFF00', // Cor de fundo da parte de cima
  },
  lowerBulb: {
    width: 80,
    marginTop: -8,
    height: 75,
    borderBottomLeftRadius: 87.5,
    borderBottomRightRadius: 87.5,
    borderTopLeftRadius: 87.5,
    borderTopRightRadius: 87.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFF00', // Cor de fundo da parte de baixo
  },
});

export default App;
