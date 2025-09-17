// app/_layout.jsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    // Stack.Screen com headerShown: false oculta a barra de título padrão do navegador/aplicativo
    // Você pode habilitar em telas específicas se precisar
    <Stack screenOptions={{ headerShown: false }}>
      {/* A rota 'login' será descoberta automaticamente. 
          Você pode definir mais Stack.Screen aqui se quiser controle específico sobre elas. */}
      {/* <Stack.Screen name="login" options={{ headerShown: false }} /> */}
      {/* Se você tiver uma tela 'index.tsx' e quiser que ela seja a inicial, defina-a aqui. */}
      {/* <Stack.Screen name="(index)" options={{ headerShown: false }} /> */}
    </Stack>
  );
}