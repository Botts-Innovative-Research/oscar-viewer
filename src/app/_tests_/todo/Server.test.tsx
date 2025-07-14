import {render, screen, fireEvent, waitFor, cleanup, queryByLabelText} from '@testing-library/react';
import * as React from 'react';
import BackButton from '../../_components/BackButton';
import { createRoot } from 'react-dom/client';
import '@testing-library/jest-dom';

