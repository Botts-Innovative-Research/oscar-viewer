"use client";

import { LaneStatusType } from 'types/new-types';
import LaneStatusItem from '../_components/LaneStatusItem';
import React from 'react';

const testData: LaneStatusType = {
  id: 0,
  name: 'Test Lane',
  status: 'Background'
}

export default function LaneStatus() {

  return (
    <LaneStatusItem key={testData.id} id={testData.id} name={testData.name} status={testData.status} />
  );
}
