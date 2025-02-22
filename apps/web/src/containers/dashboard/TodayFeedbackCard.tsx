/**
 * Copyright 2023 LINE Corporation
 *
 * LINE Corporation licenses this file to you under the Apache License,
 * version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { DashboardCard } from '@/components';
import { useOAIQuery } from '@/hooks';

const endDate = dayjs().toISOString();
const yesterdayEndDate = dayjs().subtract(1, 'day').toISOString();

interface IProps {
  projectId: number;
}

const TodayFeedbackCard: React.FC<IProps> = ({ projectId }) => {
  const { t } = useTranslation();

  const { data: currentData } = useOAIQuery({
    path: '/api/statistics/feedback/count',
    variables: {
      from: dayjs().startOf('day').toISOString(),
      to: endDate,
      projectId,
    },
    queryOptions: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  });

  const { data: previousData } = useOAIQuery({
    path: '/api/statistics/feedback/count',
    variables: {
      from: dayjs().subtract(1, 'day').startOf('day').toISOString(),
      to: yesterdayEndDate,
      projectId,
    },
    queryOptions: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  });

  const percentage = useMemo(() => {
    if (!currentData || !previousData) return 0;
    return (
      ((currentData.count - previousData.count) / previousData.count) * 100
    );
  }, [currentData, previousData]);

  return (
    <DashboardCard
      data={(currentData?.count ?? 0).toLocaleString()}
      title={t('card.dashboard.today-feedback.title')}
      description={t('card.dashboard.today-feedback.description', {
        targetDate: dayjs().format('YYYY/MM/DD'),
        compareDate: dayjs().subtract(1, 'day').format('YYYY/MM/DD'),
      })}
      percentage={percentage}
    />
  );
};

export default TodayFeedbackCard;
