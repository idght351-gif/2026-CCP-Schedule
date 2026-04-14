import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, MessageCircle, TrendingUp } from 'lucide-react';

export const IntroSection: React.FC = () => {
  const cards = [
    {
      icon: <Sparkles className="w-6 h-6 text-primary-purple" />,
      title: "[소개] 우리 팀의 건강한 성장을 돕는 '문화컨설팅'",
      content: (
        <>
          문화컨설팅은 팀 스스로 조직문화를 진단하고 개선점을 찾아가는 <span className="text-primary-purple font-bold">현대제철만의 팀 빌딩 여정</span>입니다. 2024년부터 시작되어 매년 100여 개의 팀이 참여해 온 이 여정은, 올해 <span className="text-primary-purple font-bold">첫 번째 사이클의 소중한 마침표</span>를 찍게 됩니다.
        </>
      ),
      bgColor: "bg-pastel-purple/30"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-blue-600" />,
      title: "[활동] 보고서 확인부터 팀빌딩까지, 소통의 시간",
      content: (
        <>
          팀별 <span className="text-blue-600 font-bold">진단 보고서</span>를 통해 우리 팀의 현주소를 객관적으로 파악하고, 도출된 보완 키워드를 주제로 심도 있게 논의합니다. 이어지는 <span className="text-blue-600 font-bold">맞춤형 팀빌딩 활동</span>은 키워드 개선은 물론, 팀원 간의 결속력을 높이는 <span className="text-blue-600 font-bold">활기찬 에너지</span>를 채워줄 것입니다.
        </>
      ),
      bgColor: "bg-pastel-blue/40"
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      title: "[변화] 더 단단해진 팀워크, 더 깊어질 내일",
      content: (
        <>
          이번 과정을 통해 우리 팀은 서로를 더 깊이 이해하고 <span className="text-green-600 font-bold">한 단계 더 성장</span>하게 됩니다. 올해 다진 탄탄한 기초를 바탕으로, 내년부터는 더욱 정교하고 고도화된 <span className="text-green-600 font-bold">상세 심화 프로그램</span>이 도입되어 여러분의 <span className="text-green-600 font-bold">조직문화 혁신을 전폭적으로 지원</span>할 예정입니다.
        </>
      ),
      bgColor: "bg-pastel-green/40"
    }
  ];

  return (
    <section className="mb-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white to-pastel-purple/10 rounded-[40px] p-8 md:p-10 border border-pastel-purple shadow-sm"
      >
        <div className="max-w-3xl mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-main mb-3">
            현대제철 조직문화 혁신, <span className="text-primary-purple">그 소중한 여정</span>
          </h2>
          <p className="text-text-muted font-medium leading-relaxed">
            서로를 이해하고 함께 성장하는 시간을 통해 우리 팀만의 고유한 문화를 만들어갑니다.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/60 backdrop-blur-sm p-6 md:p-8 rounded-[32px] border border-white shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row gap-6 items-start md:items-center"
            >
              <div className={`w-16 h-16 shrink-0 ${card.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                {card.icon}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-extrabold text-text-main text-lg md:text-xl leading-tight">
                  {card.title}
                </h3>
                <p className="text-sm md:text-[15px] text-text-muted leading-relaxed break-keep">
                  {card.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
