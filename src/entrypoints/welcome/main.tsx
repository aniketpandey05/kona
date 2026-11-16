import { render } from 'preact';
import { Welcome } from './Welcome';
// Kona's own page, so it gets the fonts as well as the tokens, 3g keeps them
// out of the panel, not out of the rooms that are ours.
import '../../design/fonts.css';
import '../../design/tokens.css';
import './welcome.css';

render(<Welcome />, document.getElementById('app')!);
