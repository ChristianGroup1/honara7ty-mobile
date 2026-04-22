const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-smartlook-analytics',
  'android',
  'src',
  'turbo',
  'SmartlookSensitivityViewManager.kt',
);

if (!fs.existsSync(file)) {
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');

if (!source.includes('import com.facebook.react.bridge.Arguments')) {
  source = source.replace(
    'import com.facebook.react.viewmanagers.SmartlookSensitiveViewManagerDelegate\n',
    'import com.facebook.react.viewmanagers.SmartlookSensitiveViewManagerDelegate\nimport com.facebook.react.bridge.Arguments\n',
  );
}

source = source.replace(
  'delegate.receiveCommand(view, commandId, args)',
  'delegate.receiveCommand(view, commandId ?: return, args ?: Arguments.createArray())',
);

fs.writeFileSync(file, source);
