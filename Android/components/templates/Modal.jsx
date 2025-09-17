import { MaterialIcons } from '@expo/vector-icons'; // Para o ícone de fechar
import { Dimensions, Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <RNModal
      animationType="fade"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose} // Obrigatório para Android para fechar com o botão voltar
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={30} color="#1e3653" />
          </TouchableOpacity>
          {children}
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo escuro semi-transparente
  },
  modalView: {
    margin: 20,
    backgroundColor: '#dddddd', // Cor de fundo do seu modal
    borderRadius: 40, // Raio da borda do seu modal
    padding: 30, // Preenchimento interno
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: width * 0.8, // 80% da largura da tela
    minHeight: height * 0.3, // 30% da altura da tela
    maxWidth: 450, // Maximo 450px para telas maiores, como no seu CSS
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1, // Para garantir que o botão esteja acima do conteúdo
    padding: 5, // Aumenta a área de toque
  },
});

export default Modal;