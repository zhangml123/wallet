import React from 'react';
import { connect } from 'react-redux'
import { DeviceEventEmitter, ListView, StyleSheet, Image, View, Text, Platform, Modal, Animated, TouchableOpacity, Easing, Clipboard, ImageBackground, ScrollView } from 'react-native';
import { TabViewAnimated, TabBar, SceneMap } from 'react-native-tab-view';
import RCTDeviceEventEmitter from 'RCTDeviceEventEmitter' 
import store from 'react-native-simple-store';
import UColor from '../../utils/Colors'
import Button from '../../components/Button'
import Echarts from 'native-echarts'
import UImage from '../../utils/Img'
import AnalyticsUtil from '../../utils/AnalyticsUtil';
import QRCode from 'react-native-qrcode-svg';
var Dimensions = require('Dimensions')
const maxWidth = Dimensions.get('window').width;
const maxHeight = Dimensions.get('window').height;
import { EasyToast } from "../../components/Toast"
import { EasyDialog } from "../../components/Dialog"
import { EasyLoading } from '../../components/Loading';
import { Eos } from "react-native-eosjs";

@connect(({ wallet, assets }) => ({ ...wallet, ...assets }))
class Home extends React.Component {

  static navigationOptions = {
    title: '钱包',
    header: null,
    headerStyle: {
      paddingTop:Platform.OS == 'ios' ? 30 : 20,
      backgroundColor: UColor.mainColor,
      borderBottomWidth:0,
    },
  };

  constructor(props) {
    super(props);
    this.state = {
      status: 'rgba(255, 255, 255,0)',
      dataSource: new ListView.DataSource({ rowHasChanged: (row1, row2) => row1 !== row2 }),
      fadeAnim: new Animated.Value(15),  //设置初始值
      modal: false,
      balance: '0',
      account: 'xxxx',
      show: false,
      init: true,
      invalidWalletList: [],
      totalBalance: '0.00',
      increase:0,
      Invalid: false,
      arr1: 0,
      isChecked: true,
    };
  }

  componentDidMount() {
    this.getBalance();
    this.getIncrease();
    //加载地址数据
    this.props.dispatch({ type: 'wallet/updateInvalidState', payload: {Invalid: false}});
    this.props.dispatch({ type: 'wallet/info', payload: { address: "1111" }, callback: () => {
      this.props.dispatch({ type: 'assets/myAssetInfo', payload: { page: 1}, callback: (myAssets) => {
        this.getBalance();
      }});
    }});
    this.props.dispatch({ type: 'wallet/walletList' });
    this.props.dispatch({ type: 'wallet/invalidWalletList',  callback: (invalidWalletList) => {
      if(invalidWalletList != null){
        this.setState({ 
          Invalid: true,
          arr1 : invalidWalletList.length,
          invalidWalletList : invalidWalletList
         })
      }
    }});

    Animated.timing(
      this.state.fadeAnim,  //初始值
      {
        toValue: 22,            //结束值
        duration: 2000,        //动画时间
        easing: Easing.linear,
      },
    ).start();               //开始
    DeviceEventEmitter.addListener('wallet_info', (data) => {
      this.getBalance();
    });
    DeviceEventEmitter.addListener('updateDefaultWallet', (data) => {
      this.props.dispatch({ type: 'wallet/info', payload: { address: "1111" } });
      this.getBalance();
    });

    this.listener = RCTDeviceEventEmitter.addListener('createWallet',(value)=>{  
      this.createWallet();  
    });  

    DeviceEventEmitter.addListener('eos_increase', (data) => {
      if(data == null || data == undefined){
        reurn;
      }
      this.setState({increase: data});
    });

    DeviceEventEmitter.addListener('eos_balance', (data) => {
      if(this.props.list == null || this.props.list.length == 0){
        this.props.dispatch({ type: 'wallet/info', payload: { address: "1111" } });
      }
      this.calTotalBalance();
    });

    // DeviceEventEmitter.addListener('asset_balance', (data) => {
      // this.setAssetBalance(data);
    // });
  }

  componentWillUnmount(){
    this.listener.remove();  
  }

  calTotalBalance(){
    if(this.props.myAssets == null){
      return;
    }
    var sum = 0;
    for(var i = 0; i < this.props.myAssets.length; i++){
        if(this.props.myAssets[i].balance == null || this.props.myAssets[i].asset.value == null){
          continue;
        }
        var total = this.props.myAssets[i].balance.replace(this.props.myAssets[i].asset.name, "") * this.props.myAssets[i].asset.value;
        sum = sum + total;
    }
    this.setState({totalBalance: sum.toFixed(2)});
  }

  adjustTotalBalance(obj){
    var dispassert;
    // obj = '12345678911.01';
    if(obj >= 10000.00){
      dispassert = (obj/10000.00).toFixed(2);
      dispassert += '万';
    }else{
      dispassert = obj;
    }
    if(dispassert == null){
      return this.state.totalBalance;
    }
    return dispassert;
  }

  getIncrease(){
    // if (this.props.defaultWallet == null || this.props.defaultWallet.name == null || !this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived')) {
    //   return;
    // }

    // if(this.state.init){
    //   this.setState({init: false});
    //   EasyLoading.show();
    // }

    // if(this.props.myAssets == null){
    //   return;
    // }

    this.props.dispatch({ type: 'sticker/listincrease', payload: { type: 0}, callback: (data) => { 
        if(data == undefined || data == null){
          reurn;
        }
        if(data[0].increase){
          this.setState({increase: data[0].increase});
        }
    } });
  }
  getBalance() { 
    if (this.props.defaultWallet == null || this.props.defaultWallet.name == null || !this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived')) {
      return;
    }

    if(this.state.init){
      this.setState({init: false});
      EasyLoading.show();
    }

    if(this.props.myAssets == null){
      return;
    }

    this.props.dispatch({ type: 'assets/getBalance', payload: { accountName: this.props.defaultWallet.name}, callback: () => {
      this.calTotalBalance();
      EasyLoading.dismis();
    }});

  }


  onRequestClose() {
    this.setState({
      modal: false
    });
  }

  // 显示/隐藏 modal  
  _setModalInvalid() {
    this.props.dispatch({ type: 'wallet/updateInvalidState', payload: {Invalid: false}});
  }

  selectItem = (item,section) => { 
    this.props.dispatch({ type: 'wallet/up', payload: { item:item} });
  }

 delInvalidWallet = (rowData) => {
    if(this.props.allInvalidWalletList == null || this.props.allInvalidWalletList.length == 0){
      return;
    }
    var arr = [];
    for(var i = 0; i < this.props.invalidWalletList.length; i++){ 
        if(this.props.invalidWalletList[i].isChecked == true){
          arr.push(this.props.invalidWalletList[i]);
        }     
    }
    this.props.dispatch({ type: 'wallet/delWalletList', payload: { walletList: arr } });
    EasyToast.show("删除无效账号成功！");
    this._setModalInvalid(); 
  }


  onPress(key, data = {}) {
    const { navigate } = this.props.navigation;
    if(this.props.defaultWallet != null && this.props.defaultWallet.name != null && (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))){
      EasyDialog.show("温馨提示", "您的账号未激活", "激活", "取消", () => {
        this.WalletDetail(this.props.defaultWallet);
        EasyDialog.dismis()
      }, () => { EasyDialog.dismis() });

      return;
    }

    if (key == 'qr') {
      AnalyticsUtil.onEvent('Receipt_code');

      if (this.props.defaultWallet != null && this.props.defaultWallet.name != null && (this.props.defaultWallet.isactived && this.props.defaultWallet.hasOwnProperty('isactived'))) {
        // this._setModalVisible();
        navigate('TurnIn', {});
      } else {
        EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
          this.createWallet();
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });
      }
    }else if (key == 'Bvote') {
      if (this.props.defaultWallet == null || this.props.defaultWallet.account == null || (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))) {
        EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
          this.createWallet();
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });  
        return;
      }
      navigate('Bvote', {data, balance: this.state.balance});
    }else if (key == 'transfer') {
      if (this.props.defaultWallet == null || this.props.defaultWallet.account == null || (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))) {
        EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
          this.createWallet();
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });  
        return;
      }
      navigate('TurnOut', { coins:'EOS', balance: this.state.balance });
    }else if (key == 'Resources') {
      if (this.props.defaultWallet == null || this.props.defaultWallet.account == null || (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))) {
        EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
          this.createWallet();
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });  
        return;
      }
      navigate('Resources', {});
    }else if(key == 'add'){
      if (this.props.defaultWallet == null || this.props.defaultWallet.account == null || (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))) {
        EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
          this.createWallet();
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });  
        return;
      }
      navigate('Add_assets', {});
    } else{
      EasyDialog.show("温馨提示", "该功能正在紧急开发中，敬请期待！", "知道了", null, () => { EasyDialog.dismis() });
    }
  }

  scan() {
    if(this.props.defaultWallet != null && this.props.defaultWallet.name != null && (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))){
      EasyDialog.show("温馨提示", "您的账号未激活", "激活", "取消", () => {
        this.WalletDetail(this.props.defaultWallet);
        EasyDialog.dismis()
      }, () => { EasyDialog.dismis() });

      return;
    }
    AnalyticsUtil.onEvent('Scavenging_transfer');
    if (this.props.defaultWallet != null && this.props.defaultWallet.name != null && this.props.defaultWallet.isactived && this.props.defaultWallet.hasOwnProperty('isactived')) {
      const { navigate } = this.props.navigation;
      navigate('BarCode', {});
    } else {
      EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
        this.createWallet();
        EasyDialog.dismis()
      }, () => { EasyDialog.dismis() });
    }
  }

  _setModalVisible() {
    let isShow = this.state.show;
    this.setState({
      show: !isShow,
    });
  }

  copy = () => {
    let address;
    if (this.props.defaultWallet != null && this.props.defaultWallet.account != null && (this.props.defaultWallet.isactived && this.props.defaultWallet.hasOwnProperty('isactived'))) {
      address = this.props.defaultWallet.account;
    } else {
      address = this.state.account;
    }
    this._setModalVisible();
    Clipboard.setString(address);
    EasyToast.show("复制成功");
  }

  createWallet() {
    const { navigate } = this.props.navigation;
    navigate('WalletManage', {});
    this.setState({
      modal: false
    });
  }

  changeWallet(data) {
    this.setState({
      modal: false
    });
    if(!data.isactived || !data.hasOwnProperty('isactived')){
      EasyDialog.show("温馨提示", "您的账号未激活", "激活", "取消", () => {
        this.WalletDetail(data);
        EasyDialog.dismis()
      }, () => { EasyDialog.dismis() });
    }else {
      const { dispatch } = this.props;
      this.props.dispatch({ type: 'wallet/changeWallet', payload: { data } });
      this.props.dispatch({ type: 'wallet/info', payload: { address: "1111" } });
    }
  }

  assetInfo(asset) {

    if (this.props.defaultWallet == null || this.props.defaultWallet.account == null) {
      //todo 创建钱包引导
      EasyDialog.show("温馨提示", "您还没有创建钱包", "创建一个", "取消", () => {
        this.createWallet();
        EasyDialog.dismis()
      }, () => { EasyDialog.dismis() });
      return;
    }else {
      if(!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived')){
        EasyDialog.show("温馨提示", "您的账号未激活", "激活", "取消", () => {
          this.WalletDetail(this.props.defaultWallet);
          EasyDialog.dismis()
        }, () => { EasyDialog.dismis() });
        return;
      }
    }
    const { navigate } = this.props.navigation;
    navigate('AssetInfo', { asset, account: this.props.defaultWallet.name });
  }

  WalletDetail(data) {
    const { navigate } = this.props.navigation;
    navigate('WalletDetail', { data});
    this.setState({
      modal: false
    });
  }

  Establish() {
    const { navigate } = this.props.navigation;
    navigate('CreateWallet', {entry: "wallet_home"});
  }
  
  Import() {
    const { navigate } = this.props.navigation;
    navigate('ImportEosKey', {});
  }

  getTodayIncrease()
  {
    var ret ;
    if(this.props.defaultWallet != null && (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))){
      ret = '+0.00';  //未激活直接返回
    }else{
      ret = (this.state.totalBalance == null || this.state.increase == null) ? '0.00' : ((this.state.increase>=0? "+" : "") +(((this.state.totalBalance * this.state.increase) / 100).toFixed(2)))
    }
    return ret;
  }
  render() {
  if(this.props.guide){
    return (
      <View style={styles.container}>
        <ScrollView>
            <Image source={UImage.guide} style={styles.imgTop} resizeMode="contain"/>
            <Button onPress={() => this.Establish()}>
              <View style={styles.btnestablish}>
                  <Text style={styles.btntext}>创建账号</Text>
              </View>
            </Button>
            <Button onPress={this.Import.bind(this)}>
              <View style={styles.btnimport}>
                  <Text style={styles.btntext}>导入账号</Text>
              </View>
            </Button>
        </ScrollView>
      </View>
    )
  }else{
    return (
      <View style={styles.container}>
        <View>
          <View style={styles.topbtn}>
            <Button onPress={() => this.scan()}>
              <Image source={UImage.scan} style={styles.imgBtn} />
            </Button>
            <Text style={styles.toptext}>EOS资产</Text>
            <Button onPress={() => this.setState({ modal: !this.state.modal })}>
              <Image source={UImage.wallet} style={styles.imgBtn} />
            </Button>
          </View>
          <ImageBackground style={styles.bgout} source={UImage.home_bg} resizeMode="cover">
            <View style={styles.head}>
              <Button onPress={this.onPress.bind(this, 'qr')} style={styles.headbtn}>
                <View style={styles.headbtnout}>
                  <Image source={UImage.qr} style={styles.imgBtn} />
                  <Text style={styles.headbtntext}>收币</Text>
                </View>
              </Button>
              <Button onPress={this.onPress.bind(this, 'transfer')} style={styles.headbtn}>
                <View style={styles.headbtnout}>
                  <Image source={UImage.transfer} style={styles.imgBtn} />
                  <Text style={styles.headbtntext}>转账</Text>
                </View>
              </Button>
              <Button onPress={this.onPress.bind(this, 'Bvote')} style={styles.headbtn}>
                <View style={styles.headbtnout}>
                  <Image source={UImage.vote_node} style={styles.imgBtn} />
                  <Text style={styles.headbtntext}>节点投票</Text>
                </View>                      
              </Button>
              
              <Button  onPress={this.onPress.bind(this, 'Resources')}  style={styles.headbtn}>
                <View style={styles.headbtnout}>
                  <Image source={UImage.resources} style={styles.imgBtn} />
                  <Text style={styles.headbtntext}>资源管理</Text>
                </View>
              </Button>
            </View>
          </ImageBackground>
          <View style={styles.addto}>
              <View style={styles.addout}>
                <View style={styles.topout}>
                  <Text style={styles.addtotext}>{(this.props.defaultWallet == null || this.props.defaultWallet.name == null) ? this.state.account : this.props.defaultWallet.name} 总资产 </Text>
                  {(this.props.defaultWallet != null && (!this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived'))) ? <Text style={styles.notactived} onPress={this.WalletDetail.bind(this,this.props.defaultWallet)}>未激活</Text>:((this.props.defaultWallet == null || this.props.defaultWallet.name == null || (this.props.defaultWallet != null &&this.props.defaultWallet.isBackups)) ? null : <Text style={styles.stopoutBackups} onPress={this.WalletDetail.bind(this,this.props.defaultWallet)}>未备份</Text>) }   
                </View>
                <View style={styles.addtoout}>
                  <Text style={styles.addtoouttext}>≈{(this.props.defaultWallet == null || !this.props.defaultWallet.isactived || !this.props.defaultWallet.hasOwnProperty('isactived')) ? '0.00' : this.adjustTotalBalance(this.state.totalBalance)}（￥）</Text>
                  <Text style={(this.state.increase>=0 || this.state.totalBalance == "0.00")?styles.incdo:styles.incup}>今日 {this.getTodayIncrease()}</Text>
                </View>
              </View>
              <Button onPress={this.onPress.bind(this, 'add')} style={styles.addtobtn}>  
                <View style={styles.addbtnout}>             
                  <Image source={UImage.add} style={styles.imgBtn} />
                  <Text style={styles.addbtnimg}>添加资产</Text>  
                </View>               
              </Button>
          </View>
        </View>   
        <ListView initialListSize={1} enableEmptySections={true} 
          dataSource={this.state.dataSource.cloneWithRows(this.props.myAssets == null ? [] : this.props.myAssets)} 
          renderRow={(rowData, sectionID, rowID) => (      
            <View style={styles.listItem}>
              <Button onPress={this.assetInfo.bind(this, rowData)}>
                <View style={styles.row}>
                  <View style={styles.lefts}>
                    <Image source={rowData.asset.icon==null ? UImage.eos : { uri: rowData.asset.icon }} style={styles.leftimg} />
                    <Text style={styles.lefttext}>{rowData.asset.name}</Text>
                  </View>
                  <View style={styles.rights}>
                    <View style={styles.rightout}>
                      <View>
                        <Text style={styles.rightbalance}>{(rowData.balance==null || rowData.balance=="")? "0.0000" : rowData.balance.replace(rowData.asset.name, "")}</Text>
                        <Text style={styles.rightmarket}>≈{(rowData.balance==null || rowData.balance=="" || rowData.asset.value == null || rowData.asset.value == "")? "0.00" : (rowData.balance.replace(rowData.asset.name, "")*rowData.asset.value).toFixed(2)}（￥）</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Button>
            </View>
          )}                
         />  
        <Modal style={styles.touchableouts} animationType={'none'} transparent={true} onRequestClose={() => { this.onRequestClose() }} visible={this.state.modal}>
          <TouchableOpacity onPress={() => this.setState({ modal: false })} style={styles.touchable} activeOpacity={1.0}>
            <TouchableOpacity style={styles.touchable} activeOpacity={1.0}>
              <View style={styles.touchableout}>
                <ListView initialListSize={5} style={styles.touchablelist}
                  renderSeparator={(sectionID, rowID) => <View key={`${sectionID}-${rowID}`} style={{ height: 0.5, backgroundColor: UColor.secdColor }} />}
                  enableEmptySections={true} dataSource={this.state.dataSource.cloneWithRows(this.props.walletList == null ? [] : this.props.walletList)}
                  renderRow={(rowData) => (
                    <Button onPress={this.changeWallet.bind(this, rowData)}>
                      <View style={styles.walletlist} backgroundColor={(this.props.defaultWallet == null || this.props.defaultWallet.name == rowData.account) ? '#586888' : '#4D607E'}>
                        <View style={styles.topout}>
                          <Text style={styles.outname}>{rowData.name}</Text>
                          {(!rowData.isactived || !rowData.hasOwnProperty('isactived')) ? <Text style={styles.notactived} onPress={this.WalletDetail.bind(this, rowData)}>未激活</Text>:(rowData.isBackups ? null : <Text style={styles.stopoutBackups} onPress={this.WalletDetail.bind(this, rowData)}>未备份</Text>)}  
                        </View>
                        <Text style={styles.walletaccount} numberOfLines={1} ellipsizeMode='middle'>{rowData.isactived && rowData.balance != null && rowData.balance != ""? rowData.balance : '0.0000'} EOS</Text>
                      </View>
                    </Button> 
                  )}
                />
                <View style={styles.ebhbtnout}>
                  <Button onPress={() => this.createWallet()} style={{height: 40,}}>
                    <View style={styles.establishout}>
                      <Image source={UImage.wallet_1} style={styles.establishimg} />
                      <Text style={styles.establishtext}>创建钱包</Text>
                    </View>
                  </Button>
                  {/* <Button onPress={() => this.walletTest()} style={{ height: 40, }}>
                    <View style={{ flex: 1, flexDirection: "row", }}>
                      <Image source={UImage.wallet_1} style={{ width: 25, height: 25, }} />
                      <Text style={{ marginLeft: 20, fontSize: 15, color: '#8594AB', }}>钱包测试</Text>
                    </View>
                  </Button> */}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

         <Modal style={styles.touchableouts} animationType={'slide'} transparent={true}  visible={this.props.Invalid} onRequestClose={()=>{}}>
            <TouchableOpacity style={styles.pupuo} activeOpacity={1.0}>
              <View style={styles.modalStyle}>
                <View style={styles.subView}> 
                  <Text style={styles.titleText}/>
                  <Text style={styles.contentText}>无效账户删除提示</Text>
                  <Button onPress={this._setModalInvalid.bind(this)}>
                    <Text style={styles.titleText}>×</Text>
                  </Button>
                </View>
                <Text style={styles.prompt}>警告：系统检测到您有无效账号残留，为了避免误转账至无效账户带来不必要的损失，请即时清理无效账户！</Text>
                <ListView style={styles.btn} renderRow={this.renderRow} enableEmptySections={true} 
                    dataSource={this.state.dataSource.cloneWithRows(this.props.invalidWalletList == null ? [] : this.props.invalidWalletList)} 
                    renderRow={(rowData, sectionID, rowID) => (                 
                      <View>
                          <Button > 
                              <View style={styles.codeout} >
                                  <View style={styles.copyout}>
                                      <Text style={styles.copytext}>{rowData.name}</Text>
                                  </View>
                                  <TouchableOpacity style={styles.taboue} onPress={ () => this.selectItem(rowData)}>
                                      <View style={styles.tabview} >
                                          <Image source={rowData.isChecked ? UImage.Tick:null} style={styles.tabimg} />
                                      </View>  
                                  </TouchableOpacity>  
                              </View> 
                          </Button>  
                      </View>      
                    )}                   
                  /> 
                  <Button onPress={this.delInvalidWallet.bind()}>
                      <View style={styles.deleteout}>
                          <Text style={styles.deletetext}>一键删除</Text>
                      </View>
                  </Button>  
              </View>
            </TouchableOpacity>
        </Modal>
      </View>
    )
  };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UColor.secdColor,
  },

  listout: {
    height: Platform.OS == 'ios' ? 70 : 75,
  },

  row: {
    backgroundColor: UColor.mainColor,
    flexDirection: "row",
    padding: 15,
    justifyContent: "space-between",
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: UColor.secdColor
  },

  topbtn: {
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: "space-between",
    width: Dimensions.get('window').width,
    paddingTop:Platform.OS == 'ios' ? 30 : 20,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: UColor.mainColor, 
  },
  toptext: {
    height: Platform.OS == 'ios' ? 65 : 50,
    lineHeight: Platform.OS == 'ios' ? 65 : 50,
    textAlign: "center",
    fontSize: 18,
    color: UColor.fontColor,
  },

  bgout: {
    justifyContent: "center" 
  },
  head: {
    height: 70, 
    flexDirection: "row",
    backgroundColor: UColor.secdColor, 
    borderRadius: 5,  
    marginTop: 20,
    marginBottom: 20,
    marginRight: 10,
    marginLeft: 10,
  },
  headbtn: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: 'center',
    padding: 5,
  },
  headbtnout: {
    flex:1, 
    alignItems: 'center', 
    justifyContent: "center",
  },
  headbtntext: {
    color: UColor.arrow,
    fontSize: 14,
  },

  addto: {
    height: 75, 
    backgroundColor: UColor.mainColor, 
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: UColor.tintColor, 
    borderBottomWidth: 2,
  },
  addout: {
    flex: 1, 
    flexDirection: "column", 
    alignItems: 'flex-start', 
    justifyContent: "center",
  },
  addtotext: {
    marginLeft: 10, 
    fontSize: 16, 
    color: UColor.fontColor
  },
  addtoout: {
    flex: 1,
    flexDirection: "row",
    alignItems: 'center', 
    justifyContent: "center", 
  },
  addtoouttext: {
    marginLeft: 10, 
    fontSize: 20, 
    color: UColor.fontColor 
  },
  addtobtn: {
    width:80, 
    alignItems: 'center', 
    justifyContent: "center",
  },
  addbtnout: {
    flex:1,  
    alignItems: 'center', 
    justifyContent: "center",
  },
  addbtnimg: {
    color:UColor.fontColor ,
    fontSize: 14, 
    textAlign:'center'
  },

  touchableouts: {
    flex: 1,
    flexDirection: "column",
  },
  touchable: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'flex-end', 
    backgroundColor: UColor.mask,
  },
  touchableout: {
    width: maxWidth / 2, 
    height: maxHeight, 
    backgroundColor: '#4D607E', 
    alignItems: 'center', 
    paddingTop: 50,
  },
  touchablelist: {
    width: '100%', 
    borderBottomWidth: 1, 
    borderBottomColor: '#4D607E', 
  },

  imgBtn: {
    width: 30,
    height: 30,
    margin:5,
  },

  walletlist: {
    width: '100%',
    paddingLeft: 20,
    paddingRight: 10,
    height: 67,
  },


  topout: {
    flexDirection: "row",
    flex: 1,
    alignItems: 'center',
  },
  outname: {
    fontSize: 14,
    color: UColor.fontColor,
    textAlign: 'left',
    marginRight: 10,
  },
  stopoutBackups: {
    height: 18,
    lineHeight: 15,
    fontSize: 10,
    color: '#2ACFFF',
    textAlign: 'left',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2ACFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  notactived: {
    height: 18,
    lineHeight: 15,
    fontSize: 10,
    color: UColor.showy,
    textAlign: 'left',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UColor.showy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },

  walletaccount: {
    flex:1,
    alignItems: 'center',
    color: '#8594AB', 
  },


 ebhbtnout: {
  width: '100%', 
  height: maxHeight / 2.5, 
  flexDirection: "column", 
  paddingLeft: 20, 
  paddingTop: 15, 
  alignItems: 'flex-start', 
  borderTopWidth: 1, 
  borderTopColor: UColor.mainColor, 
 },

  establishout: {
    flex: 1, 
    flexDirection: "row",
    alignItems: 'center', 
  },
  establishimg:{
    width: 25, 
    height: 25, 
  },
  establishtext: {
    marginLeft: 20, 
    fontSize: 15, 
    color: '#8594AB',
  },

  pupuo: {
    flex: 1, 
    justifyContent: 'flex-end', 
    alignItems: 'center',
  },
  modalStyle: {
    width: maxWidth,  height: maxHeight*2/3,  backgroundColor: UColor.fontColor,
  }, 
  subView: {
    flexDirection: "row", alignItems: 'center', justifyContent: 'center', height: 30, marginVertical: 15, paddingHorizontal: 10,
  },
  titleText: {
    width: 40, color: '#CBCBCB', fontSize: 28, textAlign: 'center',
  },
  contentText: {
    flex: 1, fontSize: 18,fontWeight: 'bold',textAlign: 'center',
  },
  buttonView: {
    alignItems: 'flex-end',
  },
  prompt: {
    fontSize: 12, color: UColor.showy, textAlign: 'left', marginBottom: 20, paddingHorizontal: 20,
  },
  codeout: {
    height: 50,flexDirection: "row", alignItems: 'center', marginHorizontal: 15, borderBottomColor: '#E5E5E5', borderBottomWidth: 1, 
  },
  copyout: {
    flex: 1, paddingLeft: 30,
  },
  copytext: {
    fontSize: 15, color: '#4D4D4D'
  },

  lefts: {
    flex: 1,
    flexDirection: "row",
    alignItems: 'center',
  },
  leftimg: {
    width: 25, 
    height: 25
  },
  lefttext: {
    marginLeft: 20,
    fontSize: 18,
    color: UColor.fontColor
  },
  rights: {
    flex: 1,
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: "flex-end"
  },
  rightout: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: 'center',
  },
  rightbalance: {
    fontSize: 18, 
    color: UColor.fontColor, 
    textAlign: 'right'
  },
  rightmarket: {
    fontSize: 12,
    color:  UColor.arrow,
    textAlign: 'right',
    marginTop: 3
  },
  incup:{
    marginLeft: 5, 
    fontSize: 16, 
    color: '#F25C49'
  },
  incdo:{
    marginLeft: 5, 
    fontSize: 16, 
    color: '#25B36B'
  },

  imgTop: {
    width: maxWidth,
    height: maxWidth*0.72,
 },
 btnestablish: {
   height: 50,
   backgroundColor:  UColor.tintColor,
   justifyContent: 'center',
   alignItems: 'center',
   marginTop: 90,
   marginHorizontal: 20,
   borderRadius: 5
 },
 btnimport: {
   height: 50,
   backgroundColor:  UColor.mainColor,
   justifyContent: 'center',
   alignItems: 'center',
   marginTop: 25,
   marginHorizontal: 20,
   borderRadius: 5
 },
 btntext: {
   fontSize:17,
   color: UColor.fontColor,
 },

 taboue: {
  justifyContent: 'center', 
  alignItems: 'center',
},
tabview: {
  width: 24,
  height: 24,
  margin: 5,
  borderColor: '#D2D2D2',
  borderWidth: 1,
},
tabimg: {
  width: 24, 
  height: 24
},

deleteout: {
  height: 50,
  marginHorizontal: 28,
  marginTop: 10,
  marginBottom: 28,
  borderRadius: 6,
  backgroundColor: UColor.tintColor,
  justifyContent: 'center',
  alignItems: 'center'
},
deletetext: {
  fontSize: 16,
  color: UColor.fontColor
},
});

export default Home;
