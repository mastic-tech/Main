/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { SparkleIcon } from './icons';

const SplashScreen: React.FC = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <SparkleIcon className="splash-logo" />
        <h1 className="splash-title">Pixshop</h1>
      </div>
    </div>
  );
};

export default SplashScreen;
