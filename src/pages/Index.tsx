import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield, TrendingUp, Leaf, Users, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
const Index = () => {
  const features = [{
    icon: TrendingUp,
    title: 'Yield Generation',
    description: 'Earn competitive yields on your project treasury while maintaining full liquidity',
    gradient: 'bg-gradient-vault'
  }, {
    icon: Shield,
    title: 'Secure & Transparent',
    description: 'Built on Stellar blockchain with audited smart contracts and full on-chain transparency',
    gradient: 'bg-gradient-stellar'
  }, {
    icon: Leaf,
    title: 'Carbon Neutral',
    description: 'Automatic carbon offset for all vault operations through StellarCarbon integration',
    gradient: 'bg-gradient-carbon'
  }, {
    icon: Users,
    title: 'DAO Integration',
    description: 'Seamlessly integrate with your existing Tansu DAO governance structure',
    gradient: 'bg-gradient-surface'
  }];
  return <Layout>
      <Navigation />
      
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-8 lg:py-12">
          <div className="container mx-auto px-6">
            <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6
            }} className="text-center max-w-4xl mx-auto space-y-8">
              
              <Badge className="bg-gradient-stellar text-primary-foreground border-0 mb-6">
                <Zap className="mr-1 h-3 w-3" />
                Powered by DeFindex & Stellar
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-stellar bg-clip-text text-transparent">Transform Your Treasury</span>
                <br />
                <span className="text-foreground">Into Yield-Generating Assets</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Connect your Tansu project to our institutional-grade DeFi vault. 
                Earn sustainable returns while maintaining full liquidity and supporting carbon neutrality.
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" className="bg-gradient-stellar text-primary-foreground border-0 glow-stellar hover:shadow-stellar transition-all duration-300" onClick={() => window.location.href = '/vault'}>
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.location.href = '/treasury'}>
                  View Treasury
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-6">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} viewport={{
            once: true
          }} className="text-center mb-8 lg:mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Choose Tansu Vault?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Built specifically for open-source projects, our vault combines the best of 
                DeFi yields with environmental responsibility and DAO governance.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => <motion.div key={index} initial={{
              opacity: 0,
              y: 20
            }} whileInView={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.6,
              delay: index * 0.1
            }} viewport={{
              once: true
            }}>
                  <Card className="glass border-border/50 hover:shadow-elevation transition-all duration-300 h-full">
                    <CardHeader>
                      <div className={`p-3 rounded-xl ${feature.gradient} w-fit`}>
                        <feature.icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>)}
            </div>
          </div>
        </section>

      </div>
    </Layout>;
};
export default Index;