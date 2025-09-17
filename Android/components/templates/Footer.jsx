// components/templates/Footer.tsx
import { StyleSheet, Text, View } from 'react-native';

const Footer = () => {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>© 2024 Galeriloop. Todos os direitos reservados.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#e3e2de',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'absolute', // Ou flexbox no layout principal
    bottom: 0,
  },
  footerText: {
    color: '#1e3653',
    fontSize: 12,
  },
});

export default Footer;
