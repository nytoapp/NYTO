import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { AppText, Button } from "./ui";
import { colors } from "./theme/tokens";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24, gap: 12 }}>
          <AppText role="headline">The screen failed to load</AppText>
          <Button label="Try again" onPress={() => this.setState({ failed: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}
