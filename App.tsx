import React, {useState, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Button,
    TouchableOpacity,
    ToastAndroid, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';
import Icon from 'react-native-vector-icons/AntDesign';

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
    id: `id_${parseInt(Math.random() * 100000)}`,
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
    const [direcaoTemperatura, setDirecaoTemperatura] = useState<string>('right');
    const [mediaTemperatura, setMediaTemperatura] = useState<number>(0);
    const [corTemperatura, setCorTemperatura] = useState<string>('blue');
    const [porcentagemTemperatura, setPorcentagemTemperatura] = useState<string>('0%');
    const [direcaoLuminosidade, setDirecaoLuminosidade] = useState<string>('right');
    const [corLuminosidade, setCorLuminosidade] = useState<string>('blue');
    const [porcentagemLuminosidade, setPorcentagemLuminosidade] = useState<string>('0%');




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
                console.log('tamanho lista: ', temperatureList.length);
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

    useEffect(() => {
        const {diferenca, media} = calcularMediaeDiferenca(temperatureList);
        setMediaTemperatura(parseFloat(media));

        if (diferenca < 0) {
            setDirecaoTemperatura('down');
            setCorTemperatura('red');
            setPorcentagemTemperatura(`-${Math.abs(diferenca)}%`);
        } else if (diferenca > 0) {
            setDirecaoTemperatura('up');
            setCorTemperatura('green');
            setPorcentagemTemperatura(`+${diferenca}%`);
        } else {
            setDirecaoTemperatura('right');
            setCorTemperatura('blue');
            setPorcentagemTemperatura(`${diferenca}%`);
        }

    }, [temperatureList]);

    useEffect(() => {
        const {diferenca} = calcularMediaeDiferenca(luminosityList);

        if (diferenca < 0) {
            setDirecaoLuminosidade('down');
            setCorLuminosidade('red');
            setPorcentagemLuminosidade(`-${Math.abs(diferenca)}%`);
        } else if (diferenca > 0) {
            setDirecaoLuminosidade('up');
            setCorLuminosidade('green');
            setPorcentagemLuminosidade(`+${diferenca}%`);
        } else {
            setDirecaoLuminosidade('right');
            setCorLuminosidade('blue');
            setPorcentagemLuminosidade(`${diferenca}%`);
        }

    }, [luminosityList]);

    const calcularMediaeDiferenca = (lista: string[]) => {
        const media = parseFloat((lista.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / lista.length)).toFixed(2);
        const ultima = parseFloat(lista[lista.length - 2]);
        const atual = parseFloat(lista[lista.length - 1]);
        const diferenca = (((atual - ultima) * 100) / ultima).toFixed(2);
        return {media, diferenca};

    }



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
            <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
                <View style={styles.container}>
                    <View style={styles.Card}>
                        <Text style={styles.CardTitle}>Temperatura</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Icon name={`arrow${direcaoTemperatura}`} size={10} color={corTemperatura}/>
                            <Text style={styles.CardText}>{`${temperature}°C`}</Text>
                            <Text style={[styles.CardText, {color: corTemperatura, fontSize: 7}]}>{porcentagemTemperatura}</Text>
                        </View>
                    </View>
                    <View style={styles.Card}>
                        <Text style={styles.CardTitle}>Luminosidade</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Icon name={`arrow${direcaoLuminosidade}`} size={10} color={corLuminosidade}/>
                            <Text style={styles.CardText}>{`${luminosityList[luminosityList.length - 1]}%`}</Text>
                            <Text style={[styles.CardText,{color: corLuminosidade, fontSize: 7}]}>{porcentagemLuminosidade}</Text>
                        </View>
                    </View>
                </View>
                <View style={[styles.Card, {alignItems: 'center'}]}>
                    <Text style={styles.CardTitle}>Media Temperatura</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.CardText}>{mediaTemperatura}</Text>
                    </View>
                </View>
                <View style={styles.botaoContainer}>
                    <Button
                        title={
                            connecting
                                ? 'Conectando...'
                                : connected
                                    ? 'Desconectar'
                                    : 'Conectar'
                        }
                        disabled={connecting}
                        onPress={connected ? () => client.disconnect() : connectToMqttServer}
                    />
                    {/*<Button*/}
                    {/*    title={*/}
                    {/*        publishing*/}
                    {/*            ? 'executando...'*/}
                    {/*            : `${lastButtonMessage === '0' ? 'Ligar' : 'Desligar'}`*/}
                    {/*    }*/}
                    {/*    onPress={publishMessage}*/}
                    {/*    disabled={!connected || publishing}*/}
                    {/*/>*/}
                </View>
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
        botaoContainer: {
            flex: 5,
            backgroundColor: '#fff',
            alignItems: 'flex-start',
            justifyContent: 'space-evenly',
            flexDirection: 'row',
        },
        container: {
            flex: 5,
            backgroundColor: '#fff',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            flexDirection: 'row',
        },
        Card: {
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 10,
            margin: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        CardTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: '#000',
        },
        CardText: {
            fontSize: 11,
            color: '#000',
        }, botao: {
            margin: 10,
        }
    }
)

export default App;
